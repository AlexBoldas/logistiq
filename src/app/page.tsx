'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { SceneObject, Bin, Warehouse } from '@/lib/types';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import SceneViewer from '@/components/scene-viewer';
import { Package, Trash2, Building, Play, X, Search } from 'lucide-react';
import { generateWarehouseData, warehouseToSceneObjects } from '@/lib/warehouse-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { AnimationState } from '@/lib/types';
import { nanoid } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';


function PalletDetails({ pallet, bin, onClose }: { pallet: SceneObject, bin: Bin | undefined, onClose: () => void }) {
    if (!pallet) return null;

    return (
        <Card className="absolute top-4 right-4 w-80 bg-card shadow-lg z-10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Pallet Details</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="grid gap-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">ID</span>
                        <span className="col-span-2 break-all">{pallet.id}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Item</span>
                        <span className="col-span-2">{bin?.item || 'N/A'}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Position</span>
                        <span className="col-span-2">{pallet.position.map(p => p.toFixed(2)).join(', ')}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Home() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [warehouse, setWarehouse] = useState<Warehouse>(() => generateWarehouseData(24, 5, 4, 2));
  const [animationStates, setAnimationStates] = useState<AnimationState[]>([]);
  const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setObjects(warehouseToSceneObjects(warehouse));
  }, [warehouse]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSelectedPalletId(null);
      return;
    }

    let foundBin: Bin | undefined;

    for (const rack of warehouse.racks) {
      for (const column of rack.columns) {
        for (const layer of column.layers) {
          foundBin = layer.bins.find(b => 
            b.isFull && (
              b.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
              (b.item && b.item.toLowerCase().includes(searchTerm.toLowerCase()))
            )
          );
          if (foundBin) break;
        }
        if (foundBin) break;
      }
      if (foundBin) break;
    }

    if (foundBin) {
      setSelectedPalletId(foundBin.id);
    } else {
      setSelectedPalletId(null);
    }
  }, [searchTerm, warehouse.racks]);

  const regenerateWarehouse = () => {
    setAnimationStates([]);
    setSelectedPalletId(null);
    setSearchTerm('');
    setWarehouse(generateWarehouseData(24, 5, 4, 2));
  };

  const clearScene = () => {
    setAnimationStates([]);
    setObjects([]);
    setSelectedPalletId(null);
    setSearchTerm('');
  };
  
  const handlePalletClick = useCallback((palletId: string | null) => {
    setSelectedPalletId(palletId);
  }, []);

  const startAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyAnimatingPalletIds = new Set(animationStates.map(a => a.palletId));
    const allFullBins = warehouse.racks
      .flatMap(r => r.columns)
      .flatMap(c => c.layers)
      .flatMap(l => l.bins)
      .filter(b => b.isFull && !currentlyAnimatingPalletIds.has(b.id));

    if (allFullBins.length > 0) {
      const fullBin = allFullBins[Math.floor(Math.random() * allFullBins.length)];
      const palletObject = objects.find(o => o.id === fullBin.id);
      
      const conveyorObject = objects
        .filter(o => o.id.startsWith('conveyor-belt') && !o.id.includes('perp'))
        .sort((a,b) => Math.abs(a.position[2] - palletObject!.position[2]) - Math.abs(b.position[2] - palletObject!.position[2]))[0];
      
      const perpConveyorObject = objects.find(o => o.id.startsWith('conveyor-belt-perp'));


      if (palletObject && conveyorObject && perpConveyorObject) {
        const conveyorStartPosition: [number, number, number] = [palletObject.position[0], conveyorObject.position[1], conveyorObject.position[2]];
        const conveyorEndPosition: [number, number, number] = [perpConveyorObject.position[0], conveyorObject.position[1], conveyorObject.position[2]];
        const perpConveyorMeetingPosition: [number, number, number] = [perpConveyorObject.position[0], perpConveyorObject.position[1], conveyorObject.position[2]];
        const perpConveyorEndPosition: [number, number, number] = [perpConveyorObject.position[0], perpConveyorObject.position[1], perpConveyorObject.position[2] + perpConveyorObject.size![2] / 4];


        const segment1Duration = 4000;
        const segment2Duration = 5000;
        const segment3Duration = 2000;
        const segment4Duration = 7000;
        const totalDuration = segment1Duration + segment2Duration + segment3Duration + segment4Duration;
        
        const newAnimationState: AnimationState = {
          id: nanoid(),
          palletId: fullBin.id,
          totalDuration: totalDuration,
          segments: [
            {
              duration: segment1Duration,
              startPosition: palletObject.position,
              endPosition: conveyorStartPosition,
            },
            {
              duration: segment2Duration,
              startPosition: conveyorStartPosition,
              endPosition: conveyorEndPosition,
            },
            {
                duration: segment3Duration,
                startPosition: conveyorEndPosition,
                endPosition: perpConveyorMeetingPosition,
            },
            {
                duration: segment4Duration,
                startPosition: perpConveyorMeetingPosition,
                endPosition: perpConveyorEndPosition,
            }
          ]
        };

        setAnimationStates(prev => [...prev, newAnimationState]);

        setTimeout(() => {
          setAnimationStates(prev => prev.filter(a => a.id !== newAnimationState.id));
        }, totalDuration + 500);
      }
    }
  };

  const hasAvailablePallets = warehouse.racks
    .flatMap(r => r.columns)
    .flatMap(c => c.layers)
    .flatMap(l => l.bins)
    .some(b => b.isFull && !animationStates.some(a => a.palletId === b.id));

  const selectedPalletObject = useMemo(() => {
    if (!selectedPalletId) return undefined;
    return objects.find(o => o.id === selectedPalletId);
  }, [selectedPalletId, objects]);

  const selectedBin = useMemo(() => {
    if (!selectedPalletId) return undefined;
    for (const rack of warehouse.racks) {
        for (const column of rack.columns) {
            for (const layer of column.layers) {
                const bin = layer.bins.find(b => b.id === selectedPalletId);
                if (bin) return bin;
            }
        }
    }
    return undefined;
  }, [selectedPalletId, warehouse.racks]);


  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="w-[--sidebar-width] flex-shrink-0">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2.5 p-1">
              <Building className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">WarehouseViz</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel>Controls</SidebarGroupLabel>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={regenerateWarehouse}>
                  <Package /> Regenerate
                </Button>
                <Button variant="secondary" onClick={startAnimation} disabled={!hasAvailablePallets}>
                  <Play /> Animate Pallet
                </Button>
                <Button variant="destructive" onClick={clearScene} disabled={objects.length === 0}>
                  <Trash2 /> Clear Scene
                </Button>
              </div>
            </SidebarGroup>
             <SidebarGroup>
                <SidebarGroupLabel>Search</SidebarGroupLabel>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Find by item or ID..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Layout</SidebarGroupLabel>
              <Accordion type="single" collapsible className="w-full" value={selectedBin ? selectedBin.id.substring(0,8) : ''}>
                {warehouse.racks.map((rack) => (
                  <AccordionItem value={rack.id} key={rack.id}>
                    <AccordionTrigger>{rack.name}</AccordionTrigger>
                    <AccordionContent>
                      <Accordion type="single" collapsible>
                        {rack.columns.map((column) => (
                          <AccordionItem value={column.id} key={column.id}>
                            <AccordionTrigger>{column.name}</AccordionTrigger>
                            <AccordionContent>
                              {column.layers.map((layer) => (
                                <div key={layer.id} className="p-2">
                                  <p className="font-semibold">{layer.name}</p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {layer.bins.map((bin) => (
                                      <Badge
                                        key={bin.id}
                                        variant={bin.isFull ? 'default' : 'secondary'}
                                        className="cursor-pointer"
                                        title={bin.isFull ? `Item: ${bin.item}` : 'Empty'}
                                        onClick={() => handlePalletClick(bin.isFull ? bin.id : null)}
                                      >
                                        {bin.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <p className="text-xs text-muted-foreground">© 2024 WarehouseViz</p>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 bg-background overflow-hidden relative">
          <SceneViewer 
            objects={objects} 
            animationStates={animationStates} 
            onPalletClick={handlePalletClick} 
            selectedPalletId={selectedPalletId}
            />
            {selectedPalletObject && (
              <PalletDetails 
                pallet={selectedPalletObject} 
                bin={selectedBin} 
                onClose={() => handlePalletClick(null)} 
                />
            )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
