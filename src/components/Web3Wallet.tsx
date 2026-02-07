/**
 * Web3Wallet Component
 * Wallet connection UI with MetaMask, WalletConnect, and Coinbase support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown, 
  AlertCircle,
  LogOut,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  popular?: boolean;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect to your MetaMask wallet',
    popular: true
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Scan with WalletConnect'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '📘',
    description: 'Connect to Coinbase Wallet'
  }
];

const NETWORKS = [
  { id: 1, name: 'Ethereum Mainnet', symbol: 'ETH', color: '#627EEA' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
  { id: 56, name: 'BSC', symbol: 'BNB', color: '#F3BA2F' }
];

export const Web3Wallet: React.FC = () => {
  const {
    isConnected,
    address,
    chainId,
    balance,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance
  } = useWeb3();

  const [isOpen, setIsOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<number | null>(null);

  const handleConnect = async (walletType: string) => {
    try {
      await connect(walletType);
      setShowWalletModal(false);
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setIsOpen(false);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitchNetwork = async (networkId: number) => {
    try {
      await switchNetwork(networkId);
      setSelectedNetwork(null);
    } catch (err) {
      console.error('Network switch failed:', err);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num === 0) return '0.00';
    if (num < 0.01) return '<0.01';
    return num.toFixed(4);
  };

  const currentNetwork = NETWORKS.find(n => n.id === chainId);

  if (!isConnected) {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowWalletModal(true)}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
        >
          {isConnecting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </motion.button>

        <AnimatePresence>
          {showWalletModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowWalletModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Connect Wallet
                  </h2>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {WALLET_OPTIONS.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleConnect(wallet.id)}
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all text-left"
                    >
                      <span className="text-3xl">{wallet.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {wallet.name}
                          </span>
                          {wallet.popular && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {wallet.description}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                  By connecting, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-all"
      >
        {currentNetwork && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentNetwork.color }}
          />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {formatAddress(address!)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Connected</span>
                <div className="flex items-center gap-1 text-green-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs">Live</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded-lg">
                  {formatAddress(address!)}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`https://polygonscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Balance</span>
                <button
                  onClick={refreshBalance}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">TRM</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatBalance(balance?.trm || '0')} TRM
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentNetwork?.symbol || 'ETH'}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatBalance(balance?.native || '0')} {currentNetwork?.symbol || 'ETH'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Network</span>
              <button
                onClick={() => setSelectedNetwork(selectedNetwork ? null : chainId || 137)}
                className="w-full flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {currentNetwork && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentNetwork.color }}
                    />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {currentNetwork?.name || 'Unknown Network'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${selectedNetwork ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {selectedNetwork && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1">
                      {NETWORKS.map((network) => (
                        <button
                          key={network.id}
                          onClick={() => handleSwitchNetwork(network.id)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                            chainId === network.id
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: network.color }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {network.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center gap-2 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Web3Wallet;
