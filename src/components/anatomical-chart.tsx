
// src/components/anatomical-chart.tsx
'use client';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AnatomicalChartProps = {
    data: { name: string; total: number }[];
};

const BodyPartSVG = ({ partName, count, maxCount }: { partName: string, count: number, maxCount: number }) => {
    const paths: { [key: string]: { d: string; view: 'front' | 'back' | 'both' } } = {
        'CABEZA': { d: 'M 65,21 C 58.4,21 53,26.4 53,33 C 53,39.6 58.4,45 65,45 C 71.6,45 77,39.6 77,33 C 77,26.4 71.6,21 65,21 Z', view: 'both' },
        'OJO IZQUIERDO': { d: 'M 60,30 a 2,2 0 1,1 -4,0 a 2,2 0 1,1 4,0', view: 'front'},
        'OJO DERECHO': { d: 'M 70,30 a 2,2 0 1,1 -4,0 a 2,2 0 1,1 4,0', view: 'front'},
        'CUELLO': { d: 'M 61,45 L 69,45 L 70,50 L 60,50 Z', view: 'both' },
        'TRONCO': { d: 'M 55,50 L 75,50 L 78,95 L 52,95 Z', view: 'front' },
        'ESPALDA': { d: 'M 185,50 L 205,50 L 208,95 L 182,95 Z', view: 'back'},
        'HOMBRO IZQUIERDO': { d: 'M 55,50 C 48,52 45,60 45,60 L 52,65 L 55,50 Z', view: 'both' },
        'HOMBRO DERECHO': { d: 'M 75,50 C 82,52 85,60 85,60 L 78,65 L 75,50 Z', view: 'both' },
        'BRAZO IZQUIERDO': { d: 'M 45,60 L 40,90 L 50,92 L 52,65 Z', view: 'both' },
        'BRAZO DERECHO': { d: 'M 85,60 L 90,90 L 80,92 L 78,65 Z', view: 'both' },
        'CODO IZQUIERDO': { d: 'M 40,90 L 38,100 L 50,102 L 50,92 Z', view: 'both' },
        'CODO DERECHO': { d: 'M 90,90 L 92,100 L 80,102 L 80,92 Z', view: 'both' },
        'MANO IZQUIERDA': { d: 'M 38,100 L 35,115 L 48,116 L 50,102 Z', view: 'both' },
        'MANO DERECHA': { d: 'M 92,100 L 95,115 L 82,116 L 80,102 Z', view: 'both' },
        'PIERNA IZQUIERDA': { d: 'M 52,95 L 45,150 L 58,150 L 60,95 Z', view: 'both' },
        'PIERNA DERECHA': { d: 'M 78,95 L 85,150 L 72,150 L 70,95 Z', view: 'both' },
        'RODILLA IZQUIERDA': { d: 'M 45,150 L 42,165 L 58,165 L 58,150 Z', view: 'both' },
        'RODILLA DERECHA': { d: 'M 85,150 L 88,165 L 72,165 L 72,150 Z', view: 'both' },
        'PIE IZQUIERDO': { d: 'M 42,165 L 38,180 L 58,180 L 58,165 Z', view: 'both' },
        'PIE DERECHO': { d: 'M 88,165 L 92,180 L 72,180 L 72,165 Z', view: 'both' },
    };
    
    const partInfo = paths[partName];
    if (!partInfo) return null;

    const getColor = () => {
        if (count === 0) return 'hsl(var(--muted))';
        const opacity = Math.min(1, 0.2 + (count / maxCount) * 0.8);
        // Using red for injuries (hsl(0, ...))
        return `hsla(0, 70%, 50%, ${opacity})`;
    };
    
    const getStrokeColor = () => {
        return count > 0 ? 'hsl(0, 70%, 40%)' : 'hsl(var(--muted-foreground))';
    }

    return (
        <>
            {(partInfo.view === 'front' || partInfo.view === 'both') &&
                <path d={partInfo.d} fill={getColor()} stroke={getStrokeColor()} strokeWidth="0.5" transform="translate(10, 10)" />
            }
             {(partInfo.view === 'back' || partInfo.view === 'both') &&
                <path d={partInfo.d} fill={getColor()} stroke={getStrokeColor()} strokeWidth="0.5" transform="translate(130, 10)" />
            }
        </>
    );
};


export const AnatomicalChart = ({ data }: AnatomicalChartProps) => {
    const maxCount = useMemo(() => Math.max(...data.map(d => d.total), 1), [data]);

    const allParts = [
        'CABEZA', 'OJO IZQUIERDO', 'OJO DERECHO', 'CUELLO', 'HOMBRO DERECHO', 'HOMBRO IZQUIERDO', 'BRAZO DERECHO', 'BRAZO IZQUIERDO', 
        'CODO DERECHO', 'CODO IZQUIERDO', 'MANO DERECHA', 'MANO IZQUIERDA', 'TRONCO', 'ESPALDA',
        'PIERNA DERECHA', 'PIERNA IZQUIERDA', 
        'RODILLA DERECHA', 'RODILLA IZQUIERDA', 'PIE DERECHO', 'PIE IZQUIERDO'
    ];

    const chartData = useMemo(() => {
        return allParts.map(part => {
            const entry = data.find(d => d.name === part);
            return {
                name: part,
                total: entry ? entry.total : 0,
            };
        }).filter(d => d.total > 0).sort((a,b) => a.total - b.total);

    }, [data]);
    

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                 <svg viewBox="0 0 240 200" className="max-h-80 opacity-50">
                    {allParts.map(part => (
                        <BodyPartSVG key={`placeholder-${part}`} partName={part} count={0} maxCount={1} />
                    ))}
                </svg>
                <p className="mt-4">No hay datos de lesiones para mostrar con los filtros actuales.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className="md:col-span-1 flex flex-col justify-center items-center h-full">
                <svg viewBox="0 0 240 200" className="max-h-full max-w-full">
                    {allParts.map(part => (
                        <BodyPartSVG 
                            key={`part-${part}`} 
                            partName={part} 
                            count={data.find(d => d.name === part)?.total || 0} 
                            maxCount={maxCount} 
                        />
                    ))}
                </svg>
                 <div className="flex w-full justify-around text-xs mt-2">
                    <span>Vista Frontal</span>
                    <span>Vista Posterior</span>
                </div>
            </div>
            <div className="md:col-span-2 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={120} interval={0} fontSize={12} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="total" name="N° Lesiones" fill="hsl(var(--primary))" barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
