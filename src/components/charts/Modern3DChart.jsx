import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Modern3DChart({ data, width = 800, height = 400, type = 'bar' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || !data?.length) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      1000
    );
    camera.position.set(8, 8, 12);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xf97316, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x3b82f6, 0.8, 100);
    pointLight2.position.set(-10, 5, -10);
    scene.add(pointLight2);

    // Create bars/elements based on data
    const maxValue = Math.max(...data.map(d => d.value || 0), 1);
    
    data.forEach((item, index) => {
      const height = (item.value / maxValue) * 5;
      const geometry = new THREE.BoxGeometry(0.8, height, 0.8);
      
      const hue = 0.6 - ((item.value / maxValue) * 0.4);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(hue, 0.8, 0.5),
        emissive: new THREE.Color(0xf97316),
        emissiveIntensity: 0.2,
        shininess: 100
      });
      
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set((index - (data.length - 1) / 2) * 1.5, height / 2, 0);
      scene.add(bar);

      // Outline
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.position.copy(bar.position);
      scene.add(wireframe);
    });

    // Grid
    const gridHelper = new THREE.GridHelper(15, 15, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    // Animation
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      scene.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, width, height]);

  return <div ref={mountRef} className="rounded-xl overflow-hidden" />;
}