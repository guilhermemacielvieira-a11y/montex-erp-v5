import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import * as THREE from 'three';

export default function Chart3DProduction({ projetos, itensProducao }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / 300,
      0.1,
      1000
    );
    camera.position.set(8, 8, 12);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, 300);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xf97316, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x3b82f6, 0.8, 100);
    pointLight2.position.set(-10, 5, -10);
    scene.add(pointLight2);

    // Data bars
    const projetosAtivos = projetos.filter(p => 
      ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)
    ).slice(0, 6);

    const maxValue = Math.max(...projetosAtivos.map(p => {
      const fabricacao = itensProducao
        .filter(i => i.projeto_id === p.id && i.etapa === 'fabricacao')
        .reduce((acc, i) => acc + (i.percentual_conclusao || 0), 0) / 
        (itensProducao.filter(i => i.projeto_id === p.id && i.etapa === 'fabricacao').length || 1);
      return fabricacao;
    }), 1);

    projetosAtivos.forEach((projeto, index) => {
      const fabricacao = itensProducao
        .filter(i => i.projeto_id === projeto.id && i.etapa === 'fabricacao')
        .reduce((acc, i) => acc + (i.percentual_conclusao || 0), 0) / 
        (itensProducao.filter(i => i.projeto_id === projeto.id && i.etapa === 'fabricacao').length || 1);
      
      const height = (fabricacao / maxValue) * 5;
      const geometry = new THREE.BoxGeometry(0.8, height, 0.8);
      
      // Gradient material
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.6 - (fabricacao / 100) * 0.4, 0.8, 0.5),
        emissive: new THREE.Color(0xf97316),
        emissiveIntensity: 0.2,
        shininess: 100,
        specular: 0x444444
      });
      
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set((index - 2.5) * 1.5, height / 2, 0);
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

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / 300;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, 300);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [projetos, itensProducao]);

  return (
    <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Produção em 3D
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mountRef} className="w-full h-[300px]" />
      </CardContent>
    </Card>
  );
}