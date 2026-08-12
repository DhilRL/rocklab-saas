import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check, Image as ImageIcon } from 'lucide-react';

export default function ImageCropModal({ image, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Set canvas size to a standard small size to keep file size low (e.g. 400x400)
    canvas.width = 400;
    canvas.height = 400;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      400,
      400
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.8); // 0.8 quality for good compression
    });
  };

  const handleDone = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImageBlob);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-teal-600" />
            <h3 className="font-black text-slate-800 uppercase tracking-tighter">Adjust Profile Photo</h3>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500"/></button>
        </div>

        <div className="relative h-80 bg-slate-200">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1"><ZoomOut className="w-3 h-3"/> Zoom Out</span>
              <span className="flex items-center gap-1">Zoom In <ZoomIn className="w-3 h-3"/></span>
            </div>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all border border-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              className="flex-[2] bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-teal-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Check className="w-5 h-5" /> Set Profile Photo
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-teal-50 text-center">
            <p className="text-[10px] text-teal-700 font-bold uppercase tracking-tighter">Tip: Drag to position your face in the circle</p>
        </div>
      </div>
    </div>
  );
}