'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneObject, AnimationState } from '@/lib/types';

interface SceneViewerProps {
  objects: SceneObject[];
  animationStates: AnimationState[];
  onPalletClick: (id: string | null) => void;
  selectedPalletId: string | null;
}

const createPallet = (size: [number, number, number], color: string) => {
  const pallet = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.2,
  });

  const [width, height, depth] = size;

  const plankHeight = 0.1;
  const numTopPlanks = 5;
  const plankWidth = width / numTopPlanks;
  const plankGap = 0.05;

  // Top planks
  for (let i = 0; i < numTopPlanks; i++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankWidth - plankGap, plankHeight, depth),
      material
    );
    plank.position.set(
      i * plankWidth - width / 2 + plankWidth / 2,
      height / 2 - plankHeight / 2,
      0
    );
    pallet.add(plank);
  }

  const supportHeight = height - plankHeight;
  const supportWidth = 0.2;
  const supportDepth = 0.2;

  // 3 support beams
  const beamPositions = [-depth / 2 + supportDepth/2, 0, depth / 2 - supportDepth/2];
  beamPositions.forEach(z => {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(width, supportHeight, supportDepth),
        material
      );
      beam.position.set(0, 0, z);
      pallet.add(beam);
  });
  
  return pallet;
};


const SceneViewer = ({ objects, animationStates, onPalletClick, selectedPalletId }: SceneViewerProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const animationFrameRef = useRef<number>();
  const traceLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const originalPalletColorsRef = useRef<Map<string, string>>(new Map());
  const clockRef = useRef<THREE.Clock | null>(null);
  const mixersRef = useRef<Map<string, THREE.AnimationMixer>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const pointerRef = useRef<THREE.Vector2 | null>(null);


  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('hsl(var(--background))');
    
    clockRef.current = new THREE.Clock();
    raycasterRef.current = new THREE.Raycaster();
    pointerRef.current = new THREE.Vector2();

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc, 
        side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(100, 100);
    scene.add(gridHelper);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current?.getDelta() ?? 0;
      mixersRef.current.forEach(mixer => mixer.update(delta));

      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    const handlePointerDown = (event: PointerEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        pointerRef.current!.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointerRef.current!.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerUp = (event: PointerEvent) => {
        if (!mountRef.current || !pointerRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        const endX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const endY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (Math.abs(pointerRef.current.x - endX) < 0.01 && Math.abs(pointerRef.current.y - endY) < 0.01) {
            handleSceneClick(event);
        }
    };
    
    const handleSceneClick = (event: PointerEvent) => {
        if (!raycasterRef.current || !cameraRef.current || !sceneRef.current || !pointerRef.current) return;

        raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(Array.from(meshesRef.current.values()), true);

        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            while(clickedObject.parent && !(clickedObject.parent instanceof THREE.Scene)) {
                clickedObject = clickedObject.parent;
            }

            const clickedId = [...meshesRef.current.entries()].find(([_, mesh]) => mesh === clickedObject)?.[0];

            if (clickedId && objects.find(o => o.id === clickedId)?.type === 'pallet') {
                onPalletClick(clickedId);
            } else {
                onPalletClick(null);
            }
        } else {
            onPalletClick(null);
        }
    };

    mountRef.current.addEventListener('pointerdown', handlePointerDown);
    mountRef.current.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!mountRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
          mountRef.current.removeEventListener('pointerdown', handlePointerDown);
          mountRef.current.removeEventListener('pointerup', handlePointerUp);
          if (renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
          }
      }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      meshesRef.current.clear();
      mixersRef.current.clear();
      traceLinesRef.current.forEach(line => scene.remove(line));
      traceLinesRef.current.clear();
    };
  }, [onPalletClick, objects]);

  const setPalletColor = (pallet: THREE.Object3D, color: string | THREE.Color) => {
    pallet.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.color.set(color);
        }
    });
  };

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentObjectIds = new Set(objects.map((o) => o.id));
    
    // Remove old objects
    meshesRef.current.forEach((mesh, id) => {
      if (!currentObjectIds.has(id)) {
        scene.remove(mesh);
        if (mesh instanceof THREE.Mesh) {
            mesh.geometry.dispose();
            if(Array.isArray(mesh.material)){
            mesh.material.forEach(m => m.dispose());
            } else {
            mesh.material.dispose();
            }
        } else if (mesh instanceof THREE.Group) {
            mesh.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            })
        }
        meshesRef.current.delete(id);
      }
    });

    // Add or update objects
    objects.forEach((obj) => {
      let object3D = meshesRef.current.get(obj.id);
      const isAnimating = animationStates.some(a => a.palletId === obj.id);

      if (!object3D) {
        const size = obj.size || [1, 1, 1];
        if (obj.type === 'pallet') {
            object3D = createPallet(size, obj.color);
        } else {
            let geometry;
            switch (obj.type) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(size[0] / 2, 32, 32);
                    break;
                case 'torus':
                    geometry = new THREE.TorusGeometry(size[0] / 2, 0.4, 16, 100);
                    break;
                case 'box':
                default:
                    geometry = new THREE.BoxGeometry(...size);
                    break;
            }
            const material = new THREE.MeshStandardMaterial({
                color: obj.color,
                roughness: 0.5,
                metalness: 0.5,
            });
            object3D = new THREE.Mesh(geometry, material);
        }
        
        object3D.position.set(...obj.position);
        scene.add(object3D);
        meshesRef.current.set(obj.id, object3D);
      } else {
        if (!isAnimating) {
          object3D.position.set(...obj.position);
        }
        if (obj.type === 'pallet') {
            const color = obj.id === selectedPalletId ? '#ff0000' : obj.color;
            setPalletColor(object3D, color);
        } else if (object3D instanceof THREE.Mesh) {
            (object3D.material as THREE.MeshStandardMaterial).color.set(obj.color);
        }
      }
    });

  }, [objects, selectedPalletId, animationStates]);


  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const activeAnimationIds = new Set(animationStates.map(a => a.id));

    // Cleanup old mixers and trace lines
    mixersRef.current.forEach((_, animationId) => {
        if(!activeAnimationIds.has(animationId)) {
            const mixer = mixersRef.current.get(animationId);
            mixer?.stopAllAction();
            mixersRef.current.delete(animationId);

            const traceLine = traceLinesRef.current.get(animationId);
            if(traceLine) {
                scene.remove(traceLine);
                traceLinesRef.current.delete(animationId);
            }
            
            originalPalletColorsRef.current.forEach((color, palletId) => {
                const palletMesh = meshesRef.current.get(palletId);
                if (palletMesh && !animationStates.some(a => a.palletId === palletId)) {
                    const finalColor = palletId === selectedPalletId ? '#ff0000' : color;
                    setPalletColor(palletMesh, finalColor);
                    originalPalletColorsRef.current.delete(palletId);
                }
            })
        }
    });

    // Process current animations
    animationStates.forEach(animationState => {
        if(mixersRef.current.has(animationState.id)) return; // Already running

        const palletMesh = meshesRef.current.get(animationState.palletId);
        if (palletMesh) {
            // Save original color
            const firstMesh = (palletMesh as THREE.Group).children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
            if (firstMesh && firstMesh.material instanceof THREE.MeshStandardMaterial) {
                originalPalletColorsRef.current.set(animationState.palletId, `#${firstMesh.material.color.getHexString()}`);
            }
            setPalletColor(palletMesh, '#ffff00');

            // Create mixer
            const mixer = new THREE.AnimationMixer(palletMesh);
            mixersRef.current.set(animationState.id, mixer);

            // Create animation track
            const times: number[] = [];
            const values: number[] = [];
            let currentTime = 0;

            animationState.segments.forEach((segment, index) => {
                if (index === 0) {
                    times.push(currentTime);
                    values.push(...segment.startPosition);
                }
                currentTime += segment.duration / 1000;
                times.push(currentTime);
                values.push(...segment.endPosition);
            });

            const positionTrack = new THREE.VectorKeyframeTrack('.position', times, values);
            const clip = new THREE.AnimationClip(`PalletMovement_${animationState.id}`, -1, [positionTrack]);
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
            
            mixer.addEventListener('finished', () => {
                const originalColor = originalPalletColorsRef.current.get(animationState.palletId);
                if (originalColor) {
                    const finalColor = animationState.palletId === selectedPalletId ? '#ff0000' : originalColor;
                    setPalletColor(palletMesh, finalColor);
                    originalPalletColorsRef.current.delete(animationState.palletId);
                }
            });


            // Create trace line
            const points = animationState.segments.reduce((acc, segment) => {
                if (acc.length === 0) {
                    acc.push(new THREE.Vector3(...segment.startPosition));
                }
                acc.push(new THREE.Vector3(...segment.endPosition));
                return acc;
            }, [] as THREE.Vector3[]);
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({ color: 0xffff00, dashSize: 0.2, gapSize: 0.1 });
            const traceLine = new THREE.Line(geometry, material);
            traceLine.computeLineDistances();
            scene.add(traceLine);
            traceLinesRef.current.set(animationState.id, traceLine);
        }
    });

  }, [animationStates, selectedPalletId]);
  
  
    useEffect(() => {
        meshesRef.current.forEach((mesh, id) => {
            const obj = objects.find(o => o.id === id);
            if (obj?.type === 'pallet') {
                const isAnimating = animationStates.some(anim => anim.palletId === id);
                if (isAnimating) return;
                
                const color = id === selectedPalletId ? '#ff0000' : obj.color;
                setPalletColor(mesh, color);
            }
        });
    }, [selectedPalletId, objects, animationStates]);
    
    useEffect(() => {
        if (selectedPalletId && controlsRef.current && cameraRef.current) {
            const palletMesh = meshesRef.current.get(selectedPalletId);
            if (palletMesh) {
                const targetPosition = new THREE.Vector3();
                palletMesh.getWorldPosition(targetPosition);
                
                const cameraPosition = new THREE.Vector3();
                cameraPosition.copy(targetPosition);
                cameraPosition.z += 5;
                cameraPosition.y += 3;
                
                cameraRef.current.position.lerp(cameraPosition, 0.1);
                controlsRef.current.target.lerp(targetPosition, 0.1);
            }
        }
    }, [selectedPalletId]);

  return <div ref={mountRef} className="h-full w-full" />;
};

export default SceneViewer;
