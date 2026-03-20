import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export function Barcode({ value, width = 2, height = 60, displayValue = false, className = '' }: BarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, value, { format: 'CODE128', width, height, displayValue, background: 'transparent', lineColor: '#3D3D4E', margin: 0 });
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  }, [value, width, height, displayValue]);
  return <svg ref={barcodeRef} className={className}></svg>;
}
