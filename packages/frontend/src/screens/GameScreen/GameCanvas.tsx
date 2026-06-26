import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Line, Group } from "react-konva";
import type { FoundArea } from "../../machines/gameMachine";

interface GameCanvasProps {
  imageUrl: string;
  foundAreas: FoundArea[];
  onPointClick: (x: number, y: number) => void; // normalisierte Koordinaten 0..1
  width?: number;
  height?: number;
}

/**
 * Zeigt das Aufgabenbild und nimmt Klicks/Taps entgegen. Die Fehlerbereiche
 * selbst sind dem Client nicht bekannt (siehe Sicherheitshinweis im
 * Anforderungsdokument) – jeder Klick wird per API serverseitig geprüft.
 * Bereits gefundene Bereiche werden mit einer Pinnadel + grünem Umriss markiert.
 */
export function GameCanvas({ imageUrl, foundAreas, onPointClick, width = 640, height = 480 }: GameCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => setImage(img);
  }, [imageUrl]);

  function handleClick(e: any) {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    onPointClick(pos.x / width, pos.y / height);
  }

  return (
    <Stage width={width} height={height} ref={stageRef} onClick={handleClick} onTap={handleClick}>
      <Layer>
        {image && <KonvaImage image={image} width={width} height={height} />}

        {foundAreas.map((area) => {
          const points = area.polygon.flatMap((p) => [p.x * width, p.y * height]);
          const centerX = (area.polygon.reduce((s, p) => s + p.x, 0) / area.polygon.length) * width;
          const centerY = (area.polygon.reduce((s, p) => s + p.y, 0) / area.polygon.length) * height;

          return (
            <Group key={area.areaId}>
              <Line points={points} closed stroke="#0F6E56" strokeWidth={2} fill="rgba(15,110,86,0.2)" />
              <Circle x={centerX} y={centerY} radius={6} fill="#0F6E56" />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
