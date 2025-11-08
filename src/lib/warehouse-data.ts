
import { nanoid } from 'nanoid';
import type { Warehouse, Rack, Column, Layer, Bin, SceneObject } from './types';

export function generateWarehouseData(
  numRacks: number,
  numColumnsPerRack: number,
  numLayersPerColumn: number,
  numBinsPerLayer: number
): Warehouse {
  const racks: Rack[] = [];
  for (let i = 0; i < numRacks; i++) {
    const columns: Column[] = [];
    for (let j = 0; j < numColumnsPerRack; j++) {
      const layers: Layer[] = [];
      for (let k = 0; k < numLayersPerColumn; k++) {
        const bins: Bin[] = [];
        for (let l = 0; l < numBinsPerLayer; l++) {
          bins.push({
            id: nanoid(),
            name: `Bin ${l + 1}`,
            isFull: Math.random() > 0.5,
          });
        }
        layers.push({
          id: nanoid(),
          name: `Layer ${k + 1}`,
          bins,
        });
      }
      columns.push({
        id: nanoid(),
        name: `Column ${j + 1}`,
        layers,
      });
    }
    racks.push({
      id: nanoid(),
      name: `Rack ${i + 1}`,
      columns,
    });
  }
  return { racks };
}

export function warehouseToSceneObjects(warehouse: Warehouse): SceneObject[] {
  const objects: SceneObject[] = [];
  const binSize = { x: 1.2, y: 0.8, z: 1 };
  const layerGap = 0.2;
  const columnGap = 0.3;
  const rackGap = 2; // Gap between racks in the same row
  const aisleGap = 4; // Gap between rows of racks
  const racksPerRow = 4;
  const rackStructureWidth = 0.1;
  const floorOffset = 0;

  let currentX = 0;
  let currentZ = 0;
  let maxRackDepthInRow = 0;
  
  let maxRowWidth = 0;

  // Pre-calculate max row width
  for (let i = 0; i < warehouse.racks.length; i += racksPerRow) {
    let rowWidth = 0;
    for (let j = 0; j < racksPerRow && i + j < warehouse.racks.length; j++) {
      const rack = warehouse.racks[i + j];
      const rackWidth = rack.columns.length * (binSize.x + columnGap) - columnGap;
      rowWidth += rackWidth + rackGap;
    }
    if (rowWidth > maxRowWidth) {
      maxRowWidth = rowWidth;
    }
  }


  const addConveyor = (idSuffix: string, zPos: number) => {
    const beltLength = maxRowWidth;
    const beltWidth = 1;
    const beltHeight = 0.2;
    const legSize = 0.15;
    const numLegs = 10;
    
    objects.push({
        id: `conveyor-belt-${idSuffix}`,
        type: 'box',
        position: [beltLength / 2 - rackGap / 2, 1, zPos],
        size: [beltLength, beltHeight, beltWidth],
        color: '#333333'
    });

    for (let i = 0; i < numLegs; i++) {
        const legXPos = (i / (numLegs - 1)) * (beltLength - legSize) + legSize/2;
        objects.push({
            id: `conveyor-leg-${idSuffix}-${i}-1`,
            type: 'box',
            position: [legXPos - rackGap / 2, (1-beltHeight/2)/2, zPos - beltWidth/2 - legSize/2],
            size: [legSize, 1-beltHeight/2, legSize],
            color: '#666666'
        });
        objects.push({
            id: `conveyor-leg-${idSuffix}-${i}-2`,
            type: 'box',
            position: [legXPos - rackGap / 2, (1-beltHeight/2)/2, zPos + beltWidth/2 + legSize/2],
            size: [legSize, 1-beltHeight/2, legSize],
            color: '#666666'
        });
    }
  };

  // Add the "original" conveyor before the first row of racks
  addConveyor('original', -aisleGap / 2);
  currentZ += aisleGap / 2;


  warehouse.racks.forEach((rack, rackIndex) => {
    const rackDepth = rack.columns[0].layers[0].bins.length * binSize.z;
    const rackWidth = rack.columns.length * (binSize.x + columnGap) - columnGap;
    const rackHeight = (rack.columns[0].layers.length - 1) * (binSize.y + layerGap) + binSize.y;

    // Start a new row
    if (rackIndex > 0 && rackIndex % racksPerRow === 0) {
        currentX = 0;
        currentZ += maxRackDepthInRow + aisleGap;
        maxRackDepthInRow = 0;
        
        // Add conveyor belt in the aisle before the new row of racks
        const conveyorZ = currentZ - aisleGap / 2;
        addConveyor(`${rackIndex / racksPerRow}`, conveyorZ);
    }


    if (rackDepth > maxRackDepthInRow) {
      maxRackDepthInRow = rackDepth;
    }
    
    // Add vertical posts for the rack
    for (let i = 0; i <= rack.columns.length; i++) {
      for (let j = 0; j < 2; j++) {
        objects.push({
          id: `${rack.id}-vpost-${i}-${j}`,
          type: 'box',
          position: [
            currentX + i * (binSize.x + columnGap) - columnGap / 2 - binSize.x/2,
            rackHeight / 2,
            currentZ + (j * (rackDepth - rackStructureWidth)) - (rackDepth / 2) + rackStructureWidth/2,
          ],
          color: '#a0a0a0',
          size: [rackStructureWidth, rackHeight, rackStructureWidth],
        });
      }
    }
    
    // Add horizontal beams for all layers, including the bottom
    for (let i = 0; i < rack.columns[0].layers.length; i++) {
        const layerY = i * (binSize.y + layerGap); 
        // Horizontal beams connecting vertical posts
        for (let j = 0; j < 2; j++) {
            objects.push({
                id: `${rack.id}-hbeam-front-back-${i}-${j}`,
                type: 'box',
                position: [
                    currentX + rackWidth / 2 - binSize.x / 2,
                    layerY + binSize.y/2 - rackStructureWidth / 2,
                    currentZ + (j * (rackDepth - rackStructureWidth)) - (rackDepth / 2) + rackStructureWidth/2,
                ],
                color: '#a0a0a0',
                size: [rackWidth, rackStructureWidth, rackStructureWidth],
            });
        }
    }
     // Add bottom beams
    for (let j = 0; j < 2; j++) {
      objects.push({
        id: `${rack.id}-hbeam-bottom-${j}`,
        type: 'box',
        position: [
          currentX + rackWidth / 2 - binSize.x / 2,
          rackStructureWidth / 2,
          currentZ +
            (j * (rackDepth - rackStructureWidth)) -
            rackDepth / 2 +
            rackStructureWidth / 2,
        ],
        color: '#a0a0a0',
        size: [rackWidth, rackStructureWidth, rackStructureWidth],
      });
    }

    rack.columns.forEach((column, colIndex) => {
      const columnX = currentX + colIndex * (binSize.x + columnGap);

      column.layers.forEach((layer, layerIndex) => {
        const layerY = floorOffset + binSize.y / 2 + layerIndex * (binSize.y + layerGap);
        
        if (layerIndex >= 0) {
            objects.push({
                id: `${layer.id}-shelf`,
                type: 'box',
                position: [
                    columnX,
                    layerY - binSize.y / 2 - rackStructureWidth/2,
                    currentZ,
                ],
                color: '#c0c0c0',
                size: [binSize.x, rackStructureWidth, rackDepth],
            });
        }


        layer.bins.forEach((bin, binIndex) => {
          if (bin.isFull) {
            const binZ = binIndex * binSize.z - (rackDepth / 2) + (binSize.z / 2);

            objects.push({
              id: bin.id,
              type: 'pallet',
              position: [columnX, layerY, currentZ + binZ],
              color: '#d2b48c',
              size: [binSize.x - 0.1, binSize.y, binSize.z - 0.1],
            });
          }
        });
      });
    });
    currentX += rackWidth + rackGap;
  });

  // Add one last conveyor for after the last row
  const lastConveyorZ = currentZ + maxRackDepthInRow + aisleGap / 2;
  addConveyor('last', lastConveyorZ);

  const addPerpendicularConveyor = (xPos: number, startZ: number, endZ: number) => {
    const beltLength = Math.abs(endZ - startZ);
    const beltWidth = 1;
    const beltHeight = 0.2;
    const legSize = 0.15;
    const numLegs = Math.floor(beltLength / 5) + 2;

    objects.push({
        id: `conveyor-belt-perp-${xPos}`,
        type: 'box',
        position: [xPos, 1, startZ + beltLength / 2],
        size: [beltWidth, beltHeight, beltLength],
        color: '#333333'
    });
    for (let i = 0; i < numLegs; i++) {
        const legZPos = startZ + (i / (numLegs - 1)) * (beltLength - legSize) + legSize / 2;
        objects.push({
            id: `conveyor-leg-perp-${xPos}-${i}-1`,
            type: 'box',
            position: [xPos - beltWidth/2 + legSize/2, (1-beltHeight/2)/2, legZPos],
            size: [legSize, 1-beltHeight/2, legSize],
            color: '#666666'
        });
        objects.push({
            id: `conveyor-leg-perp-${xPos}-${i}-2`,
            type: 'box',
            position: [xPos + beltWidth/2 - legSize/2, (1-beltHeight/2)/2, legZPos],
            size: [legSize, 1-beltHeight/2, legSize],
            color: '#666666'
        });
    }
  };

  const perpConveyorX = -rackGap;
  const perpConveyorStartZ = -aisleGap;
  const perpConveyorEndZ = lastConveyorZ + aisleGap;
  addPerpendicularConveyor(perpConveyorX, perpConveyorStartZ, perpConveyorEndZ);

  return objects;
}
