import React from 'react';

// Barcode generator using jsbarcode library
// jsbarcode renders directly to a canvas or SVG element
const Barcode: React.FC<{ code: string; width?: number; height?: number }> = ({ code, width = 2, height = 50 }) => {
  // We use a ref to trigger jsbarcode rendering
  React.useEffect(() => {
    // @ts-ignore - jsbarcode expects a canvas or span element
    jsbarcode(document.createElement('span'), code, {
      format: 'code128',
      width: width,
      height: height,
      displayValue: true,
      margin: 2,
    });
  }, [code]);

  return <svg className="barcode-svg" aria-label={`Barcode: ${code}`} />;
};

export default Barcode;