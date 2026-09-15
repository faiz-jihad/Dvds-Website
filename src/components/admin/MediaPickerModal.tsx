import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Check, Search, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { FocalPointPicker } from './FocalPointPicker';
import { homepageApi } from '../../lib/homepageApi';
import { MediaAsset } from '../../types/homepage';
import { uploadAdminImage } from '../../lib/adminMedia';
import { useUiStore } from '../../stores/useUiStore';

interface MediaPickerResult {
  url: string;
  altText?: string;
  focalPoint?: { x: number; y: number };
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: MediaPickerResult) => void;
  initialUrl?: string;
  initialAlt?: string;
  initialFocalPoint?: { x: number; y: number };
  title?: string;
  aspectRatioClass?: string;
}

const DEFAULT_FOCAL_POINT = { x: 50, y: 50 };

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialUrl = '',
  initialAlt = '',
  initialFocalPoint = DEFAULT_FOCAL_POINT,
  title = 'Select or Configure Media Asset',
  aspectRatioClass = 'aspect-[16/9]',
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'focal'>('library');
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [selectedUrl, setSelectedUrl] = useState(initialUrl);
  const [altText, setAltText] = useState(initialAlt);
  const [focalPoint, setFocalPoint] = useState(initialFocalPoint);
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      homepageApi.getMediaLibrary().then(setMediaLibrary).catch((error) => {
        useUiStore.getState().addToast(error instanceof Error ? error.message : 'Media library could not be loaded.', 'error');
      });
      setSelectedUrl(initialUrl);
      setAltText(initialAlt);
      setFocalPoint(initialFocalPoint);
      if (initialUrl) {
        setActiveTab('focal');
      } else {
        setActiveTab('library');
      }
    }
  }, [isOpen, initialUrl, initialAlt, initialFocalPoint]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await uploadAdminImage(file);
      const newAsset: MediaAsset = {
        id: `upload-${Date.now()}`,
        url: dataUrl,
        filename: file.name,
        altText: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        size: file.size,
        mimeType: file.type,
        focalPoint: { x: 50, y: 50 },
        createdAt: new Date().toISOString(),
      };

      await homepageApi.saveMediaAsset(newAsset);
      setMediaLibrary((prev) => [newAsset, ...prev]);
      setSelectedUrl(dataUrl);
      setAltText(newAsset.altText || '');
      setActiveTab('focal');
    } catch (error) {
      useUiStore.getState().addToast(error instanceof Error ? error.message : 'Image upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setSelectedUrl(customUrlInput.trim());
    if (!altText) setAltText('Custom visual asset');
    setActiveTab('focal');
  };

  const handleConfirm = () => {
    if (!selectedUrl || uploading) return;
    onSelect({
      url: selectedUrl,
      altText: altText.trim(),
      focalPoint,
    });
    onClose();
  };

  const filteredLibrary = mediaLibrary.filter(
    (item) =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.altText && item.altText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="2xl">
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'library'
                ? 'bg-dark text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Media Library ({mediaLibrary.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-dark text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload / Custom URL
          </button>
          {selectedUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('focal')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'focal'
                  ? 'bg-brand-blue text-white'
                  : 'text-brand-blue hover:bg-blue-50'
              }`}
            >
              Focal Point & Alt Text
            </button>
          )}
        </div>

        {/* Tab 1: Library */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archive images by keyword..."
                className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto p-1">
              {filteredLibrary.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedUrl(item.url);
                      if (item.altText) setAltText(item.altText);
                      if (item.focalPoint) setFocalPoint(item.focalPoint);
                      setActiveTab('focal');
                    }}
                    className={`group relative aspect-[16/10] rounded-lg overflow-hidden border-2 text-left transition-all bg-gray-900 ${
                      isSelected
                        ? 'border-brand-blue ring-2 ring-brand-blue/30 shadow-md'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.altText || item.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                      <p className="text-[10px] font-mono truncate">{item.filename}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Upload / URL */}
        {activeTab === 'upload' && (
          <div className="space-y-5 py-2">
            {/* File Drag and Drop / Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-brand-blue transition-colors bg-gray-50/50">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-display font-semibold text-xs text-dark mb-1">
                Upload image from computer
              </p>
              <p className="text-[11px] text-gray-500 mb-4 font-mono">
                PNG, JPG, WebP, GIF, SVG up to 5MB
              </p>
              <label className="inline-flex">
                <span className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold">
                  {uploading ? 'Uploading...' : 'Browse Files'}
                </span>
                <input
                  type="file"
                  disabled={uploading}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Custom URL Input */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Or Paste Image Web URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
                />
                <Button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  disabled={!customUrlInput.trim()}
                  size="sm"
                >
                  Load Image
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Focal Point & Alt */}
        {activeTab === 'focal' && selectedUrl && (
          <div className="space-y-4">
            <FocalPointPicker
              imageUrl={selectedUrl}
              focalPoint={focalPoint}
              onChange={setFocalPoint}
              aspectRatioClass={aspectRatioClass}
            />

            <Input
              label="Image Alt Text (Crucial for Screen Readers & SEO)"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descriptive explanation of what the image depicts..."
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
          <Button variant="secondary" type="button" onClick={onClose} size="sm">
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedUrl || uploading}
            isLoading={uploading}
            size="sm"
            className="rounded-full px-6"
          >
            Apply Asset
          </Button>
        </div>
      </div>
    </Modal>
  );
};
