import { useLoader } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { TextureLoader } from 'three/src/loaders/TextureLoader'
import vertex from './glsl/shader.vert'
import fragment from './glsl/shader.frag'
import {
  BufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  RGBFormat,
  Vector2,
} from 'three'
import TestBox from '../TeatBox'

type Props = {
  imageFileLocation: string
}
const Shader = ({ imageFileLocation }: Props) => {
  const texture = useLoader(TextureLoader, imageFileLocation)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.format = RGBFormat

  const discard = true
  const width = texture.image.width
  const height = texture.image.height

  const numPoints = width * height
  let numVisible = numPoints
  let threshold = 0
  let originalColors

  if (discard) {
    // discard pixels darker than threshold #22
    numVisible = 0
    threshold = 34

    const img = texture.image

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = width
    canvas.height = height
    ctx.scale(1, -1)
    ctx.drawImage(img, 0, 0, width, height * -1)

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    originalColors = Float32Array.from(imgData.data)

    for (let i = 0; i < numPoints; i++) {
      if (originalColors[i * 4 + 0] > threshold) numVisible++
    }
  }

  const uniforms = {
    uTime: { value: 0 },
    uRandom: { value: 1.0 },
    uDepth: { value: 2.0 },
    uSize: { value: 0.0 },
    uTextureSize: { value: new Vector2(width, height) },
    uTexture: { value: texture },
    uTouch: { value: null },
  }

  const geomRef = useRef<InstancedBufferGeometry>()
  const bufferAttrIndices = new Uint32Array([0, 2, 1, 2, 3, 1])
  const indices = new Uint32Array(numVisible)
  const positions = new BufferAttribute(new Float32Array(4 * 3), 3)
  positions.setXYZ(0, -0.5, 0.5, 0.0)
  positions.setXYZ(1, 0.5, 0.5, 0.0)
  positions.setXYZ(2, -0.5, -0.5, 0.0)
  positions.setXYZ(3, 0.5, -0.5, 0.0)
  const uvs = new BufferAttribute(new Float32Array(4 * 2), 2)
  uvs.setXYZ(0, 0.0, 0.0, 0.0)
  uvs.setXYZ(1, 1.0, 0.0, 0.0)
  uvs.setXYZ(2, 0.0, 1.0, 0.0)
  uvs.setXYZ(3, 1.0, 1.0, 0.0)
  const offsets = new Float32Array(numVisible * 3)
  const angles = new Float32Array(numVisible)
  for (let i = 0, j = 0; i < numPoints; i++) {
    if (discard && originalColors[i * 4 + 0] <= threshold) continue
    offsets[j * 3 + 0] = i % width
    offsets[j * 3 + 1] = Math.floor(i / width)
    indices[j] = i
    angles[j] = Math.random() * Math.PI
    j++
  }

  useEffect(() => {
    const geometry = geomRef.current
    if (geometry) {
      geometry.setAttribute('position', positions)
      geometry.setAttribute('uv', uvs)
    }
  })

  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <TestBox position={[0, 0, 0]} />
      <mesh>
        <instancedBufferGeometry attach='geometry' ref={geomRef}>
          <instancedBufferAttribute
            array={bufferAttrIndices}
            attach='index'
            count={bufferAttrIndices.length}
            itemSize={1}
          />
          <instancedBufferAttribute
            attachObject={['attributes', 'pindex']}
            array={indices}
            itemSize={1}
            normalized={false}
          />
          <instancedBufferAttribute
            attachObject={['attributes', 'offset']}
            array={offsets}
            itemSize={3}
            normalized={false}
          />
          <instancedBufferAttribute
            attachObject={['attributes', 'angle']}
            array={angles}
            itemSize={1}
            normalized={false}
          />
        </instancedBufferGeometry>
        <shaderMaterial
          attach='material'
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          depthTest={false}
          transparent={true}
        />
      </mesh>
    </>
  )
}

export default Shader
