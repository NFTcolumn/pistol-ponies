# Three.js Skill

This skill provides guidance and best practices for developing 3D web applications using Three.js, with a focus on mobile optimization and performance.

## Core Concepts
- **Scene Graph**: Understanding the hierarchy of objects, lights, and cameras.
- **Renderer**: WebGLRenderer setup and optimization.
- **Cameras**: Perspective vs. Orthographic, and responsive updates.
- **Materials & Shaders**: Optimizing for mobile GPUs.

## Mobile Optimization
- **Pixel Ratio**: Always use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` to balance quality and performance.
- **Texture Compression**: Use Basis Universal or KTX2 for faster loads and less GPU memory.
- **Frustum Culling**: Ensure objects outside the view aren't rendered.
- **Touch Controls**: Use `touch-action: none` on the canvas to prevent browser gestures (zoom/scroll) from interfering with the game.
- **Viewport**: Use `viewport-fit=cover` and handle safe areas for modern notched phones.

## Best Practices
- **Memory Management**: Dispose of geometries, materials, and textures when no longer needed.
- **Object Pooling**: Reuse objects instead of creating new ones in the render loop.
- **Delta Time**: Always scale animations and physics by `deltaTime` for consistent behavior across frame rates.

## Troubleshooting
- **Context Loss**: Handle `webglcontextlost` and `webglcontextrestored` events.
- **Z-Fighting**: Use logarithmic depth buffer or carefully adjust near/far clipping planes.
- **Shadows**: Use them sparingly on mobile; consider baked lighting or simple blobs.
