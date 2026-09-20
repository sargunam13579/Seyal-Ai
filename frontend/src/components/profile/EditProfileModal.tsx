import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera } from 'lucide-react';
import { ImageCropperModal } from '../common/ImageCropperModal';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName: string;
  currentUsername: string;
  currentAvatarImage: string | null;
  getInitials: (name: string) => string;
  onSave: (displayName: string, username: string, avatarImage: string | null) => Promise<void> | void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentDisplayName,
  currentUsername,
  currentAvatarImage,
  getInitials,
  onSave,
}) => {
  const [editDisplayName, setEditDisplayName] = useState(currentDisplayName);
  const [editUsername, setEditUsername] = useState(currentUsername);
  const [editAvatarImage, setEditAvatarImage] = useState<string | null>(currentAvatarImage);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditDisplayName(currentDisplayName);
      setEditUsername(currentUsername);
      setEditAvatarImage(currentAvatarImage);
    }
  }, [isOpen, currentDisplayName, currentUsername, currentAvatarImage]);

  // Image crop states
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropRawImage, setCropRawImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCropRawImage(reader.result);
          setIsCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setEditAvatarImage(croppedDataUrl);
    setIsCropModalOpen(false);
    setCropRawImage(null);
  };

  const handleCropCancel = () => {
    setIsCropModalOpen(false);
    setCropRawImage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(
        editDisplayName.trim() || currentDisplayName || 'User',
        editUsername.trim() || currentUsername || 'user',
        editAvatarImage
      );
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[370px] bg-[#1a1c1e] text-slate-100 rounded-3xl p-6 shadow-2xl border border-white/10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3 className="text-base font-semibold text-white tracking-tight">
          Edit profile
        </h3>

        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="hidden"
        />

        {/* Centered Avatar with Camera Badge */}
        <div className="relative mx-auto w-28 h-28 my-5">
          {editAvatarImage ? (
            <img
              src={editAvatarImage}
              alt="Avatar"
              className="w-28 h-28 rounded-full object-cover shadow-md border-2 border-slate-700/50"
              style={{ imageRendering: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-[#37485f] text-white flex items-center justify-center text-3xl font-semibold select-none shadow-md">
              {getInitials(editDisplayName || currentDisplayName)}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-1 w-8 h-8 rounded-full bg-[#202428] border-2 border-[#1a1c1e] text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            title="Change avatar photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {editAvatarImage && (
          <div className="flex items-center justify-center gap-3 -mt-3 mb-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setCropRawImage(editAvatarImage);
                setIsCropModalOpen(true);
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium underline cursor-pointer"
            >
              Crop / Adjust
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => setEditAvatarImage(null)}
              className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
            >
              Remove photo
            </button>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3">
          {/* Display name Field */}
          <div className="rounded-xl border border-slate-700/80 bg-[#16181b] p-3 focus-within:border-slate-500 transition-all">
            <label className="block text-[11px] text-slate-400 font-medium select-none">
              Display name
            </label>
            <input
              type="text"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full bg-transparent text-sm text-slate-100 outline-none mt-1 font-sans placeholder-slate-600"
              autoFocus
            />
          </div>

          {/* Username Field */}
          <div className="rounded-xl border border-slate-700/80 bg-[#16181b] p-3 focus-within:border-slate-500 transition-all">
            <label className="block text-[11px] text-slate-400 font-medium select-none">
              Username
            </label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-transparent text-sm text-slate-100 outline-none mt-1 font-sans placeholder-slate-600"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#2c3035] hover:bg-[#383d44] text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* 2x HD Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropModalOpen}
        imageSrc={cropRawImage}
        onCrop={handleCropComplete}
        onCancel={handleCropCancel}
      />
    </div>,
    document.body
  );
};
