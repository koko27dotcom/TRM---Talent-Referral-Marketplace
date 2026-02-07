/**
 * Compression Middleware
 * Response compression middleware for TRM API
 * Features: Gzip/Brotli compression, content type filtering, size threshold, client support detection
 */

const zlib = require('zlib');
const { promisify } = require('util');

// Promisify zlib methods
const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

// Configuration
const CONFIG = {
  // Minimum response size to compress (bytes)
  MIN_SIZE: parseInt(process.env.COMPRESSION_MIN_SIZE, 10) || 1024,
  
  // Maximum response size to compress (bytes) - 100MB
  MAX_SIZE: parseInt(process.env.COMPRESSION_MAX_SIZE, 10) || 100 * 1024 * 1024,
  
  // Compression level (1-9 for gzip, 1-11 for brotli)
  GZIP_LEVEL: parseInt(process.env.GZIP_LEVEL, 10) || 6,
  BROTLI_LEVEL: parseInt(process.env.BROTLI_LEVEL, 10) || 4,
  
  // Brotli quality parameter
  BROTLI_QUALITY: 4,
  
  // MIME types to compress
  COMPRESSIBLE_TYPES: [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/vnd.api+json',
    'application/hal+json',
    'application/ld+json',
    'image/svg+xml',
  ],
  
  // MIME types to never compress
  INCOMPRESSIBLE_TYPES: [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-brotli',
    'application/octet-stream',
    'multipart/form-data',
  ],
  
  // Filter function for custom compression decisions
  FILTER: null,
};

/**
 * Get the best compression algorithm based on Accept-Encoding header
 * @param {string} acceptEncoding - Accept-Encoding header value
 * @returns {string|null} Selected algorithm or null if none supported
 */
const getCompressionAlgorithm = (acceptEncoding) => {
  if (!acceptEncoding) {
    return null;
  }
  
  const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());
  
  // Check for brotli support (br)
  for (const encoding of encodings) {
    if (encoding.includes('br')) {
      return 'br';
    }
  }
  
  // Check for gzip support
  for (const encoding of encodings) {
    if (encoding.includes('gzip')) {
      return 'gzip';
    }
  }
  
  // Check for deflate support
  for (const encoding of encodings) {
    if (encoding.includes('deflate')) {
      return 'deflate';
    }
  }
  
  return null;
};

/**
 * Check if content type should be compressed
 * @param {string} contentType - Content-Type header value
 * @returns {boolean} Whether to compress
 */
const shouldCompressType = (contentType) => {
  if (!contentType) {
    return true; // Default to compressing unknown types
  }
  
  const type = contentType.toLowerCase().split(';')[0].trim();
  
  // Check incompressible types first
  for (const incompressible of CONFIG.INCOMPRESSIBLE_TYPES) {
    if (type.startsWith(incompressible)) {
      return false;
    }
  }
  
  // Check compressible types
  for (const compressible of CONFIG.COMPRESSIBLE_TYPES) {
    if (type.startsWith(compressible)) {
      return true;
    }
  }
  
  // Default to not compressing unknown types
  return false;
};

/**
 * Check if response should be compressed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Compression options
 * @returns {boolean} Whether to compress
 */
const shouldCompress = (req, res, options = {}) => {
  // Check if compression is disabled
  if (options.enabled === false) {
    return false;
  }
  
  // Check if already compressed
  if (res.getHeader('content-encoding')) {
    return false;
  }
  
  // Check Accept-Encoding header
  const acceptEncoding = req.headers['accept-encoding'];
  if (!acceptEncoding) {
    return false;
  }
  
  // Check if client supports any compression
  const algorithm = getCompressionAlgorithm(acceptEncoding);
  if (!algorithm) {
    return false;
  }
  
  // Check Cache-Control header for no-transform
  const cacheControl = res.getHeader('cache-control');
  if (cacheControl && cacheControl.toString().includes('no-transform')) {
    return false;
  }
  
  // Check content type
  const contentType = res.getHeader('content-type');
  if (!shouldCompressType(contentType)) {
    return false;
  }
  
  // Check content length if available
  const contentLength = res.getHeader('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size < CONFIG.MIN_SIZE || size > CONFIG.MAX_SIZE) {
      return false;
    }
  }
  
  // Apply custom filter if provided
  if (options.filter && !options.filter(req, res)) {
    return false;
  }
  
  return true;
};

/**
 * Compress data using the specified algorithm
 * @param {Buffer} data - Data to compress
 * @param {string} algorithm - Compression algorithm
 * @returns {Promise<Buffer>} Compressed data
 */
const compressData = async (data, algorithm) => {
  switch (algorithm) {
    case 'br':
      return await brotliCompress(data, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: CONFIG.BROTLI_QUALITY,
        },
      });
    case 'gzip':
      return await gzip(data, { level: CONFIG.GZIP_LEVEL });
    case 'deflate':
      return await deflate(data, { level: CONFIG.GZIP_LEVEL });
    default:
      throw new Error(`Unsupported compression algorithm: ${algorithm}`);
  }
};

/**
 * Get file extension for algorithm
 * @param {string} algorithm - Compression algorithm
 * @returns {string} File extension
 */
const getAlgorithmExtension = (algorithm) => {
  switch (algorithm) {
    case 'br':
      return '.br';
    case 'gzip':
      return '.gz';
    case 'deflate':
      return '.zz';
    default:
      return '';
  }
};

/**
 * Main compression middleware
 * Compresses responses with gzip/brotli based on client support
 * @param {Object} options - Compression options
 * @returns {Function} Express middleware
 */
const compression = (options = {}) => {
  return (req, res, next) => {
    // Skip if not compressible
    if (!shouldCompress(req, res, options)) {
      return next();
    }
    
    // Get compression algorithm
    const algorithm = getCompressionAlgorithm(req.headers['accept-encoding']);
    if (!algorithm) {
      return next();
    }
    
    // Store original methods
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalSetHeader = res.setHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    // Buffer to collect response data
    let buffer = Buffer.alloc(0);
    let headersSent = false;
    let ended = false;
    
    // Override setHeader to track headers
    res.setHeader = (name, value) => {
      const lowerName = name.toLowerCase();
      
      // Don't allow content-length to be set when compressing
      if (lowerName === 'content-length') {
        return res;
      }
      
      // Track if headers have been sent
      if (!headersSent) {
        return originalSetHeader(name, value);
      }
      
      return res;
    };
    
    // Override removeHeader
    res.removeHeader = (name) => {
      if (!headersSent) {
        return originalRemoveHeader(name);
      }
    };
    
    // Override write method
    res.write = (chunk, encoding) => {
      if (ended) {
        return false;
      }
      
      if (chunk) {
        const bufferChunk = Buffer.isBuffer(chunk) 
          ? chunk 
          : Buffer.from(chunk, encoding || 'utf8');
        buffer = Buffer.concat([buffer, bufferChunk]);
      }
      
      return true;
    };
    
    // Override end method
    res.end = async (chunk, encoding) => {
      if (ended) {
        return false;
      }
      ended = true;
      
      // Add final chunk to buffer
      if (chunk) {
        const bufferChunk = Buffer.isBuffer(chunk) 
          ? chunk 
          : Buffer.from(chunk, encoding || 'utf8');
        buffer = Buffer.concat([buffer, bufferChunk]);
      }
      
      // Check if we should compress based on final size
      if (buffer.length < CONFIG.MIN_SIZE || buffer.length > CONFIG.MAX_SIZE) {
        // Restore original methods
        res.write = originalWrite;
        res.end = originalEnd;
        res.setHeader = originalSetHeader;
        res.removeHeader = originalRemoveHeader;
        
        // Send uncompressed
        originalSetHeader('Content-Length', buffer.length);
        return originalEnd(buffer);
      }
      
      try {
        // Compress the data
        const compressed = await compressData(buffer, algorithm);
        
        // Check if compression actually reduced size
        if (compressed.length >= buffer.length) {
          // Compression didn't help, send uncompressed
          res.write = originalWrite;
          res.end = originalEnd;
          res.setHeader = originalSetHeader;
          res.removeHeader = originalRemoveHeader;
          
          originalSetHeader('Content-Length', buffer.length);
          return originalEnd(buffer);
        }
        
        // Set compression headers
        headersSent = true;
        originalSetHeader('Content-Encoding', algorithm);
        originalSetHeader('Vary', 'Accept-Encoding');
        originalSetHeader('Content-Length', compressed.length);
        
        // Remove headers that don't apply to compressed content
        originalRemoveHeader('etag');
        originalRemoveHeader('content-md5');
        
        // Add compression info header (optional, for debugging)
        if (process.env.NODE_ENV === 'development') {
          originalSetHeader('X-Compression-Ratio', 
            `${((1 - compressed.length / buffer.length) * 100).toFixed(1)}%`);
        }
        
        // Restore original methods before sending
        res.write = originalWrite;
        res.end = originalEnd;
        res.setHeader = originalSetHeader;
        res.removeHeader = originalRemoveHeader;
        
        // Send compressed response
        return originalEnd(compressed);
      } catch (error) {
        console.error('Compression error:', error);
        
        // On error, send uncompressed
        res.write = originalWrite;
        res.end = originalEnd;
        res.setHeader = originalSetHeader;
        res.removeHeader = originalRemoveHeader;
        
        originalSetHeader('Content-Length', buffer.length);
        return originalEnd(buffer);
      }
    };
    
    next();
  };
};

/**
 * Stream-based compression middleware
 * For streaming responses (Server-Sent Events, large files)
 * @param {Object} options - Compression options
 * @returns {Function} Express middleware
 */
const streamCompression = (options = {}) => {
  return (req, res, next) => {
    // Check basic compression eligibility
    if (!shouldCompress(req, res, options)) {
      return next();
    }
    
    const algorithm = getCompressionAlgorithm(req.headers['accept-encoding']);
    if (!algorithm) {
      return next();
    }
    
    // Create compression stream
    let compressStream;
    
    switch (algorithm) {
      case 'br':
        compressStream = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: CONFIG.BROTLI_QUALITY,
          },
        });
        break;
      case 'gzip':
        compressStream = zlib.createGzip({ level: CONFIG.GZIP_LEVEL });
        break;
      case 'deflate':
        compressStream = zlib.createDeflate({ level: CONFIG.GZIP_LEVEL });
        break;
      default:
        return next();
    }
    
    // Set compression headers
    res.setHeader('Content-Encoding', algorithm);
    res.setHeader('Vary', 'Accept-Encoding');
    res.removeHeader('Content-Length');
    res.removeHeader('etag');
    res.removeHeader('content-md5');
    
    // Pipe response through compression stream
    compressStream.pipe(res);
    
    // Override res.write and res.end to use compression stream
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    
    res.write = (chunk, encoding) => {
      return compressStream.write(chunk, encoding);
    };
    
    res.end = (chunk, encoding) => {
      if (chunk) {
        compressStream.end(chunk, encoding);
      } else {
        compressStream.end();
      }
    };
    
    // Handle compression stream errors
    compressStream.on('error', (error) => {
      console.error('Stream compression error:', error);
      // Destroy the stream and end the response
      compressStream.destroy();
      res.end();
    });
    
    next();
  };
};

/**
 * Pre-compressed static file middleware
 * Serves pre-compressed .gz or .br files if available
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
const servePrecompressed = (options = {}) => {
  const root = options.root || process.cwd();
  
  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'];
    if (!acceptEncoding) {
      return next();
    }
    
    const algorithm = getCompressionAlgorithm(acceptEncoding);
    if (!algorithm) {
      return next();
    }
    
    // Check if pre-compressed file exists
    const ext = getAlgorithmExtension(algorithm);
    const compressedPath = req.path + ext;
    
    // This would need fs access to check file existence
    // For now, just pass through - implement with actual file system check
    next();
  };
};

/**
 * Middleware to disable compression for specific routes
 * @returns {Function} Express middleware
 */
const noCompression = () => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-transform');
    next();
  };
};

// Default export
module.exports = {
  compression,
  shouldCompress,
  compressResponse: compression,
  getCompressionAlgorithm,
  streamCompression,
  servePrecompressed,
  noCompression,
};
