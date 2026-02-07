import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  X, 
  FileImage, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Camera,
  Eye
} from 'lucide-react'

interface KYCDocumentUploadProps {
  label: string
  description?: string
  documentType: string
  onUpload: (file: File) => void
  onRemove?: () => void
  preview?: File | null
  capture?: 'user' | 'environment'
  acceptedTypes?: string[]
  maxSize?: number // in MB
}

export function KYCDocumentUpload({
  label,
  description,
  documentType,
  onUpload,
  onRemove,
  preview,
  capture,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  maxSize = 10,
}: KYCDocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    setError(null)

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`)
      return false
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Maximum size: ${maxSize}MB`)
      return false
    }

    return true
  }

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return

    setIsUploading(true)
    setUploadProgress(0)

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    try {
      // Actually upload the file
      const formData = new FormData()
      formData.append('document', file)
      formData.append('documentType', documentType)

      const response = await fetch('/api/v1/kyc/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      setUploadProgress(100)
      onUpload(file)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setPreviewUrl(null)
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setError(null)
    onRemove?.()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const isImage = preview?.type.startsWith('image/') || previewUrl
  const isPDF = preview?.type === 'application/pdf'

  return (
    <div className="w-full">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {description && (
        <p className="text-sm text-gray-500 mb-3">{description}</p>
      )}

      <AnimatePresence mode="wait">
        {preview || previewUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            {/* Preview Container */}
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {isImage ? (
                <div className="relative aspect-[4/3]">
                  <img
                    src={previewUrl || (preview ? URL.createObjectURL(preview) : '')}
                    alt="Document preview"
                    className="w-full h-full object-contain"
                  />
                  {/* Overlay with file info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white text-sm font-medium truncate">
                      {preview?.name || 'Document uploaded'}
                    </p>
                    <p className="text-white/80 text-xs">
                      {preview ? (preview.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                    </p>
                  </div>
                </div>
              ) : isPDF ? (
                <div className="aspect-[4/3] flex flex-col items-center justify-center bg-red-50">
                  <FileText className="w-16 h-16 text-red-500 mb-2" />
                  <p className="text-gray-700 font-medium">{preview?.name}</p>
                  <p className="text-gray-500 text-sm">
                    {(preview!.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="aspect-[4/3] flex flex-col items-center justify-center bg-gray-100">
                  <FileImage className="w-16 h-16 text-gray-400 mb-2" />
                  <p className="text-gray-600">{preview?.name}</p>
                </div>
              )}

              {/* Success Badge */}
              {!isUploading && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white p-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                  <p className="text-white font-medium">{uploadProgress}%</p>
                  <div className="w-32 h-1 bg-white/30 rounded-full mt-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleClick}
                disabled={isUploading}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Replace
              </button>
              <button
                onClick={handleRemove}
                disabled={isUploading}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Upload Area */}
            <div
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-6 cursor-pointer
                transition-all duration-200
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
                ${error ? 'border-red-300 bg-red-50' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes.join(',')}
                capture={capture}
                onChange={handleInputChange}
                className="hidden"
              />

              <div className="flex flex-col items-center text-center">
                {capture ? (
                  <Camera className="w-12 h-12 text-gray-400 mb-3" />
                ) : (
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                )}
                
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {capture ? 'Take a photo' : 'Click to upload'}
                </p>
                <p className="text-xs text-gray-500">
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} up to {maxSize}MB
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 flex items-start gap-2 text-sm text-red-600"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Type Hint */}
      <p className="mt-2 text-xs text-gray-400">
        Document type: <span className="font-medium capitalize">{documentType.replace(/_/g, ' ')}</span>
      </p>
    </div>
  )
}
