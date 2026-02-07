/**
 * useWeb3 Hook
 * React hook for Web3 wallet interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface WalletBalance {
  trm: string;
  native: string;
}

interface UseWeb3Return {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: WalletBalance | null;
  isConnecting: boolean;
  error: string | null;
  connect: (walletType: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (networkId: number) => Promise<void>;
  refreshBalance: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
}

// Check if MetaMask is installed
const getMetaMaskProvider = () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return (window as any).ethereum;
  }
  return null;
};

export const useWeb3 = (): UseWeb3Return => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Initialize on mount
  useEffect(() => {
    const checkConnection = async () => {
      const ethereum = getMetaMaskProvider();
      if (!ethereum) return;

      try {
        // Check if already connected
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const browserProvider = new ethers.BrowserProvider(ethereum);
          const network = await browserProvider.getNetwork();
          const signer = await browserProvider.getSigner();
          
          setProvider(browserProvider);
          setAddress(accounts[0]);
          setChainId(Number(network.chainId));
          setIsConnected(true);
          
          // Fetch balance
          await fetchBalance(browserProvider, accounts[0]);
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    };

    checkConnection();

    // Listen for account changes
    const ethereum = getMetaMaskProvider();
    if (ethereum) {
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setAddress(null);
          setBalance(null);
        } else {
          setAddress(accounts[0]);
          if (provider) {
            fetchBalance(provider, accounts[0]);
          }
        }
      });

      ethereum.on('chainChanged', (newChainId: string) => {
        setChainId(Number(newChainId));
        window.location.reload();
      });
    }

    return () => {
      if (ethereum) {
        ethereum.removeAllListeners('accountsChanged');
        ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const fetchBalance = async (
    browserProvider: ethers.BrowserProvider,
    walletAddress: string
  ) => {
    try {
      const nativeBalance = await browserProvider.getBalance(walletAddress);
      
      // Mock TRM balance - in production, fetch from token contract
      const trmBalance = '0';

      setBalance({
        trm: trmBalance,
        native: ethers.formatEther(nativeBalance)
      });
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const connect = useCallback(async (walletType: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (walletType === 'metamask') {
        const ethereum = getMetaMaskProvider();
        
        if (!ethereum) {
          throw new Error('MetaMask not installed. Please install MetaMask and try again.');
        }

        // Request account access
        const accounts = await ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const browserProvider = new ethers.BrowserProvider(ethereum);
        const network = await browserProvider.getNetwork();
        const signer = await browserProvider.getSigner();

        setProvider(browserProvider);
        setAddress(accounts[0]);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // Fetch balance
        await fetchBalance(browserProvider, accounts[0]);

        // Call backend to record connection
        const token = localStorage.getItem('token');
        if (token) {
          await fetch('/api/web3/wallet/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              walletType: 'metamask',
              address: accounts[0],
              chainId: Number(network.chainId)
            })
          });
        }
      } else {
        throw new Error(`${walletType} support coming soon`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // Call backend to disconnect
      const token = localStorage.getItem('token');
      if (token && address) {
        await fetch('/api/web3/wallet/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ address })
        });
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setIsConnected(false);
      setAddress(null);
      setChainId(null);
      setBalance(null);
      setProvider(null);
    }
  }, [address]);

  const switchNetwork = useCallback(async (networkId: number) => {
    const ethereum = getMetaMaskProvider();
    if (!ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${networkId.toString(16)}` }]
      });
    } catch (switchError: any) {
      // Chain not added to MetaMask
      if (switchError.code === 4902) {
        // Add chain configuration
        const chainConfig = getChainConfig(networkId);
        if (chainConfig) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig]
          });
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (provider && address) {
      await fetchBalance(provider, address);
    }
  }, [provider, address]);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (err) {
      console.error('Signing failed:', err);
      return null;
    }
  }, [provider]);

  return {
    isConnected,
    address,
    chainId,
    balance,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    signMessage
  };
};

// Helper function to get chain configuration
const getChainConfig = (chainId: number) => {
  const configs: Record<number, any> = {
    137: {
      chainId: '0x89',
      chainName: 'Polygon Mainnet',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrls: ['https://polygon-rpc.com'],
      blockExplorerUrls: ['https://polygonscan.com']
    },
    56: {
      chainId: '0x38',
      chainName: 'Binance Smart Chain',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      rpcUrls: ['https://bsc-dataseed.binance.org'],
      blockExplorerUrls: ['https://bscscan.com']
    },
    80001: {
      chainId: '0x13881',
      chainName: 'Mumbai Testnet',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
      blockExplorerUrls: ['https://mumbai.polygonscan.com']
    }
  };

  return configs[chainId];
};

export default useWeb3;
