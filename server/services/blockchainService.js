/**
 * Blockchain Service
 * Multi-network blockchain support for Ethereum, Polygon, and BSC
 * Provides transaction monitoring, gas optimization, and event listening
 */

const { ethers } = require('ethers');
const SmartContract = require('../models/SmartContract');
const BlockchainTransaction = require('../models/BlockchainTransaction');
const logger = require('../utils/logger');

// Network configurations
const NETWORKS = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockTime: 12, // seconds
    confirmations: 12
  },
  polygon: {
    name: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockTime: 2,
    confirmations: 20
  },
  bsc: {
    name: 'Binance Smart Chain',
    chainId: 56,
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockTime: 3,
    confirmations: 15
  }
};

// Testnet configurations
const TESTNETS = {
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
    blockTime: 12,
    confirmations: 12
  },
  mumbai: {
    name: 'Mumbai Testnet',
    chainId: 80001,
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockTime: 2,
    confirmations: 20
  },
  bscTestnet: {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    blockTime: 3,
    confirmations: 15
  }
};

class BlockchainService {
  constructor() {
    this.providers = {};
    this.signers = {};
    this.eventListeners = new Map();
    this.transactionWatchers = new Map();
    this.gasPriceCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize blockchain connections
   */
  async initialize() {
    try {
      logger.info('Initializing blockchain service...');

      // Initialize mainnet providers
      for (const [network, config] of Object.entries(NETWORKS)) {
        this.providers[network] = new ethers.JsonRpcProvider(config.rpcUrl);
        logger.info(`Initialized ${config.name} provider`);
      }

      // Initialize testnet providers if in development
      if (process.env.NODE_ENV !== 'production') {
        for (const [network, config] of Object.entries(TESTNETS)) {
          this.providers[network] = new ethers.JsonRpcProvider(config.rpcUrl);
          logger.info(`Initialized ${config.name} testnet provider`);
        }
      }

      // Initialize signer if private key is available
      if (process.env.BLOCKCHAIN_PRIVATE_KEY) {
        for (const [network, provider] of Object.entries(this.providers)) {
          this.signers[network] = new ethers.Wallet(
            process.env.BLOCKCHAIN_PRIVATE_KEY,
            provider
          );
        }
        logger.info('Initialized blockchain signers');
      }

      this.isInitialized = true;
      logger.info('Blockchain service initialized successfully');

      // Start gas price monitoring
      this.startGasPriceMonitoring();

      return true;
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Get provider for a specific network
   */
  getProvider(network) {
    const provider = this.providers[network];
    if (!provider) {
      throw new Error(`Network ${network} not supported`);
    }
    return provider;
  }

  /**
   * Get signer for a specific network
   */
  getSigner(network) {
    const signer = this.signers[network];
    if (!signer) {
      throw new Error(`Signer not available for network ${network}`);
    }
    return signer;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(network) {
    return NETWORKS[network] || TESTNETS[network];
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks() {
    const networks = { ...NETWORKS };
    if (process.env.NODE_ENV !== 'production') {
      Object.assign(networks, TESTNETS);
    }
    return networks;
  }

  /**
   * Get gas price for a network
   */
  async getGasPrice(network) {
    try {
      const provider = this.getProvider(network);
      const feeData = await provider.getFeeData();
      
      return {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get gas price for ${network}:`, error);
      throw error;
    }
  }

  /**
   * Start gas price monitoring
   */
  startGasPriceMonitoring() {
    const monitorGas = async () => {
      for (const network of Object.keys(this.providers)) {
        try {
          const gasPrice = await this.getGasPrice(network);
          this.gasPriceCache.set(network, gasPrice);
        } catch (error) {
          logger.error(`Gas price monitoring failed for ${network}:`, error);
        }
      }
    };

    // Update every 30 seconds
    setInterval(monitorGas, 30000);
    monitorGas(); // Initial update
  }

  /**
   * Get cached gas price
   */
  getCachedGasPrice(network) {
    return this.gasPriceCache.get(network);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(network, transaction) {
    try {
      const provider = this.getProvider(network);
      const gasEstimate = await provider.estimateGas(transaction);
      
      // Add 20% buffer for safety
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
      
      return gasLimit.toString();
    } catch (error) {
      logger.error(`Gas estimation failed for ${network}:`, error);
      throw error;
    }
  }

  /**
   * Get optimal gas settings
   */
  async getOptimalGasSettings(network, priority = 'normal') {
    const feeData = await this.getGasPrice(network);
    
    const multipliers = {
      slow: 0.8,
      normal: 1.0,
      fast: 1.5,
      urgent: 2.0
    };

    const multiplier = multipliers[priority] || 1.0;

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559 transaction
      return {
        maxFeePerGas: Math.floor(
          parseFloat(feeData.maxFeePerGas) * multiplier
        ).toString(),
        maxPriorityFeePerGas: Math.floor(
          parseFloat(feeData.maxPriorityFeePerGas) * multiplier
        ).toString()
      };
    } else {
      // Legacy transaction
      return {
        gasPrice: Math.floor(
          parseFloat(feeData.gasPrice) * multiplier
        ).toString()
      };
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(network, transaction, options = {}) {
    try {
      const signer = this.getSigner(network);
      
      // Get optimal gas settings
      const gasSettings = await this.getOptimalGasSettings(
        network,
        options.priority || 'normal'
      );

      // Estimate gas limit if not provided
      if (!transaction.gasLimit) {
        const gasLimit = await this.estimateGas(network, {
          ...transaction,
          from: await signer.getAddress()
        });
        transaction.gasLimit = gasLimit;
      }

      // Merge gas settings
      const tx = { ...transaction, ...gasSettings };

      // Send transaction
      const response = await signer.sendTransaction(tx);

      logger.info(`Transaction sent on ${network}:`, {
        hash: response.hash,
        to: response.to,
        value: response.value?.toString()
      });

      return {
        hash: response.hash,
        from: response.from,
        to: response.to,
        value: response.value?.toString(),
        gasLimit: response.gasLimit?.toString(),
        gasPrice: response.gasPrice?.toString(),
        nonce: response.nonce,
        data: response.data,
        chainId: response.chainId,
        wait: () => response.wait()
      };
    } catch (error) {
      logger.error(`Failed to send transaction on ${network}:`, error);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(network, txHash) {
    try {
      const provider = this.getProvider(network);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return null;
      }

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs,
        confirmations: receipt.confirmations
      };
    } catch (error) {
      logger.error(`Failed to get transaction receipt:`, error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(network, txHash, confirmations = 1) {
    try {
      const provider = this.getProvider(network);
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      
      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      };
    } catch (error) {
      logger.error(`Transaction confirmation failed:`, error);
      throw error;
    }
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(txId, network, txHash) {
    try {
      // Update transaction status to pending
      await BlockchainTransaction.findOneAndUpdate(
        { txId },
        { 
          status: 'pending',
          txHash,
          updatedAt: new Date()
        }
      );

      // Wait for confirmation
      const networkConfig = this.getNetworkConfig(network);
      const receipt = await this.waitForConfirmation(
        network,
        txHash,
        networkConfig.confirmations
      );

      // Get transaction details
      const provider = this.getProvider(network);
      const tx = await provider.getTransaction(txHash);

      // Update transaction record
      await BlockchainTransaction.findOneAndUpdate(
        { txId },
        {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          gasPrice: receipt.effectiveGasPrice || tx?.gasPrice?.toString(),
          confirmations: networkConfig.confirmations,
          updatedAt: new Date()
        }
      );

      logger.info(`Transaction ${txId} confirmed on ${network}`);

      return receipt;
    } catch (error) {
      // Update transaction status to failed
      await BlockchainTransaction.findOneAndUpdate(
        { txId },
        {
          status: 'failed',
          updatedAt: new Date()
        }
      );

      logger.error(`Transaction monitoring failed for ${txId}:`, error);
      throw error;
    }
  }

  /**
   * Start watching a transaction
   */
  watchTransaction(txId, network, txHash, callback) {
    const watcherKey = `${network}:${txHash}`;
    
    if (this.transactionWatchers.has(watcherKey)) {
      return;
    }

    const checkInterval = setInterval(async () => {
      try {
        const receipt = await this.getTransactionReceipt(network, txHash);
        
        if (receipt) {
          clearInterval(checkInterval);
          this.transactionWatchers.delete(watcherKey);
          
          await this.monitorTransaction(txId, network, txHash);
          
          if (callback) {
            callback(null, receipt);
          }
        }
      } catch (error) {
        clearInterval(checkInterval);
        this.transactionWatchers.delete(watcherKey);
        
        if (callback) {
          callback(error, null);
        }
      }
    }, 5000); // Check every 5 seconds

    this.transactionWatchers.set(watcherKey, checkInterval);

    // Auto-stop after 1 hour
    setTimeout(() => {
      if (this.transactionWatchers.has(watcherKey)) {
        clearInterval(this.transactionWatchers.get(watcherKey));
        this.transactionWatchers.delete(watcherKey);
      }
    }, 3600000);
  }

  /**
   * Listen to contract events
   */
  async listenToEvents(network, contractAddress, abi, eventName, callback) {
    try {
      const provider = this.getProvider(network);
      const contract = new ethers.Contract(contractAddress, abi, provider);

      const listenerKey = `${network}:${contractAddress}:${eventName}`;

      // Remove existing listener if any
      if (this.eventListeners.has(listenerKey)) {
        contract.off(eventName, this.eventListeners.get(listenerKey));
      }

      // Create new listener
      const listener = (...args) => {
        const event = args[args.length - 1];
        callback({
          eventName,
          args: args.slice(0, -1),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex
        });
      };

      contract.on(eventName, listener);
      this.eventListeners.set(listenerKey, listener);

      logger.info(`Started listening to ${eventName} events on ${network}`);

      return {
        stop: () => {
          contract.off(eventName, listener);
          this.eventListeners.delete(listenerKey);
          logger.info(`Stopped listening to ${eventName} events on ${network}`);
        }
      };
    } catch (error) {
      logger.error(`Failed to listen to events:`, error);
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  getContract(network, contractAddress, abi, signer = false) {
    const provider = signer ? this.getSigner(network) : this.getProvider(network);
    return new ethers.Contract(contractAddress, abi, provider);
  }

  /**
   * Get balance
   */
  async getBalance(network, address, tokenAddress = null) {
    try {
      const provider = this.getProvider(network);

      if (tokenAddress) {
        // ERC-20 token balance
        const erc20Abi = [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ];
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const [balance, decimals, symbol] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.symbol()
        ]);

        return {
          balance: balance.toString(),
          decimals,
          symbol,
          formatted: ethers.formatUnits(balance, decimals)
        };
      } else {
        // Native currency balance
        const balance = await provider.getBalance(address);
        const networkConfig = this.getNetworkConfig(network);

        return {
          balance: balance.toString(),
          decimals: networkConfig.nativeCurrency.decimals,
          symbol: networkConfig.nativeCurrency.symbol,
          formatted: ethers.formatEther(balance)
        };
      }
    } catch (error) {
      logger.error(`Failed to get balance:`, error);
      throw error;
    }
  }

  /**
   * Get block number
   */
  async getBlockNumber(network) {
    const provider = this.getProvider(network);
    return await provider.getBlockNumber();
  }

  /**
   * Get block
   */
  async getBlock(network, blockNumber) {
    const provider = this.getProvider(network);
    return await provider.getBlock(blockNumber);
  }

  /**
   * Verify message signature
   */
  async verifyMessage(message, signature) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress;
    } catch (error) {
      logger.error('Message verification failed:', error);
      return null;
    }
  }

  /**
   * Verify typed data signature
   */
  async verifyTypedData(domain, types, value, signature) {
    try {
      const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
      return recoveredAddress;
    } catch (error) {
      logger.error('Typed data verification failed:', error);
      return null;
    }
  }

  /**
   * Format units
   */
  formatUnits(value, decimals = 18) {
    return ethers.formatUnits(value, decimals);
  }

  /**
   * Parse units
   */
  parseUnits(value, decimals = 18) {
    return ethers.parseUnits(value, decimals);
  }

  /**
   * Get explorer URL for transaction
   */
  getExplorerUrl(network, txHash, type = 'tx') {
    const config = this.getNetworkConfig(network);
    if (!config) return null;

    const paths = {
      tx: 'tx',
      address: 'address',
      token: 'token',
      block: 'block'
    };

    return `${config.explorerUrl}/${paths[type]}/${txHash}`;
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    // Stop all transaction watchers
    for (const [key, interval] of this.transactionWatchers) {
      clearInterval(interval);
    }
    this.transactionWatchers.clear();

    // Stop all event listeners
    for (const [key, stopFn] of this.eventListeners) {
      if (typeof stopFn === 'function') {
        stopFn();
      }
    }
    this.eventListeners.clear();

    logger.info('Blockchain service shut down');
  }
}

// Export singleton instance
module.exports = new BlockchainService();
