import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg',
  maxSizeMb = 100,
  label = 'Upload Document',
  description = 'Drag & drop your PDF, Word, Excel, or image files, or click to browse',
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndSelect = (file: File) => {
    setError(null);
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds maximum permitted limit (${maxSizeMb} MB).`);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-2 text-left">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-6 sm:p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-classic-navy bg-blue-50/50'
            : 'border-classic-border hover:border-classic-border-dark bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-classic-border flex items-center justify-center text-classic-navy shadow-sm">
            <UploadCloud className="w-6 h-6 text-classic-navy" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-classic-text-primary">
              {label}
            </h4>
            <p className="text-xs text-classic-text-muted max-w-md mx-auto">
              {description}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose File
          </Button>

          {selectedFile && (
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-classic border border-emerald-300">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>{selectedFile.name}</span>
              <span className="font-mono text-emerald-950 font-normal">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
