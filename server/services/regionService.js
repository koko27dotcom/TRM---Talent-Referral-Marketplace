/**
 * RegionService
 * Core business logic for regional configuration and internationalization
 * Handles region detection, configuration management, language support, and compliance
 */

const RegionConfig = require('../models/RegionConfig.js');
const User = require('../models/User.js');

/**
 * Cache entry with TTL support
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expiresAt - Timestamp when cache expires
 */

/**
 * Service class for managing regional configurations and operations
 */
class RegionService {
  constructor() {
    /** @type {Map<string, CacheEntry>} In-memory cache for region configs */
    this.cache = new Map();
    /** @type {number} Default TTL in milliseconds (10 minutes) */
    this.defaultTTL = 10 * 60 * 1000;
    /** @type {Array<string>} Supported region codes */
    this.supportedRegions = ['MM', 'TH', 'SG', 'VN'];
    /** @type {string} Default region code */
    this.defaultRegion = 'MM';
    /** @type {Object} IP to region mapping for common ranges */
    this.ipRegionMap = {
      // Myanmar IP ranges (approximate)
      'MM': [
        { start: '37.111.0.0', end: '37.111.255.255' },
        { start: '103.25.12.0', end: '103.25.15.255' },
        { start: '103.47.184.0', end: '103.47.187.255' },
        { start: '103.52.12.0', end: '103.52.15.255' },
        { start: '103.61.8.0', end: '103.61.11.255' },
        { start: '103.70.216.0', end: '103.70.219.255' },
        { start: '103.89.48.0', end: '103.89.51.255' },
        { start: '103.94.48.0', end: '103.94.51.255' },
        { start: '103.116.192.0', end: '103.116.195.255' },
        { start: '103.121.156.0', end: '103.121.159.255' },
        { start: '103.133.242.0', end: '103.133.243.255' },
        { start: '103.197.196.0', end: '103.197.199.255' },
        { start: '103.200.132.0', end: '103.200.135.255' },
        { start: '103.208.184.0', end: '103.208.187.255' },
        { start: '103.231.92.0', end: '103.231.95.255' },
        { start: '103.244.188.0', end: '103.244.191.255' },
        { start: '116.206.136.0', end: '116.206.139.255' },
        { start: '117.55.192.0', end: '117.55.207.255' },
        { start: '119.160.208.0', end: '119.160.223.255' },
        { start: '136.228.192.0', end: '136.228.223.255' },
        { start: '180.235.116.0', end: '180.235.119.255' },
        { start: '203.81.64.0', end: '203.81.95.255' },
        { start: '203.81.160.0', end: '203.81.191.255' },
      ],
      // Thailand IP ranges
      'TH': [
        { start: '1.0.128.0', end: '1.0.255.255' },
        { start: '1.1.64.0', end: '1.1.127.255' },
        { start: '1.20.0.0', end: '1.20.255.255' },
        { start: '1.46.0.0', end: '1.47.255.255' },
        { start: '14.128.0.0', end: '14.143.255.255' },
        { start: '27.55.0.0', end: '27.55.255.255' },
        { start: '27.130.0.0', end: '27.131.255.255' },
        { start: '49.48.0.0', end: '49.51.255.255' },
        { start: '49.228.0.0', end: '49.229.255.255' },
        { start: '58.8.0.0', end: '58.11.255.255' },
        { start: '58.64.0.0', end: '58.65.255.255' },
        { start: '58.97.0.0', end: '58.97.255.255' },
        { start: '58.136.0.0', end: '58.143.255.255' },
        { start: '61.7.128.0', end: '61.7.255.255' },
        { start: '61.19.0.0', end: '61.19.255.255' },
        { start: '101.51.0.0', end: '101.51.255.255' },
        { start: '101.108.0.0', end: '101.111.255.255' },
        { start: '110.168.0.0', end: '110.169.255.255' },
        { start: '113.53.0.0', end: '113.53.255.255' },
        { start: '118.172.0.0', end: '118.175.255.255' },
        { start: '124.120.0.0', end: '124.123.255.255' },
        { start: '171.4.0.0', end: '171.7.255.255' },
        { start: '180.183.0.0', end: '180.183.255.255' },
        { start: '184.22.0.0', end: '184.23.255.255' },
        { start: '203.113.0.0', end: '203.113.255.255' },
        { start: '223.205.0.0', end: '223.205.255.255' },
      ],
      // Singapore IP ranges
      'SG': [
        { start: '8.128.0.0', end: '8.191.255.255' },
        { start: '14.0.16.0', end: '14.0.31.255' },
        { start: '14.100.0.0', end: '14.103.255.255' },
        { start: '27.96.0.0', end: '27.127.255.255' },
        { start: '27.109.32.0', end: '27.109.63.255' },
        { start: '36.64.0.0', end: '36.95.255.255' },
        { start: '42.60.0.0', end: '42.61.255.255' },
        { start: '43.224.0.0', end: '43.255.255.255' },
        { start: '45.64.128.0', end: '45.64.255.255' },
        { start: '49.128.0.0', end: '49.255.255.255' },
        { start: '58.96.0.0', end: '58.97.255.255' },
        { start: '59.32.0.0', end: '59.32.255.255' },
        { start: '101.32.0.0', end: '101.63.255.255' },
        { start: '103.1.0.0', end: '103.1.255.255' },
        { start: '103.2.0.0', end: '103.3.255.255' },
        { start: '103.4.0.0', end: '103.7.255.255' },
        { start: '103.8.0.0', end: '103.11.255.255' },
        { start: '103.20.0.0', end: '103.23.255.255' },
        { start: '103.30.0.0', end: '103.31.255.255' },
        { start: '103.47.128.0', end: '103.47.255.255' },
        { start: '111.65.0.0', end: '111.65.255.255' },
        { start: '116.0.64.0', end: '116.0.127.255' },
        { start: '116.14.0.0', end: '116.15.255.255' },
        { start: '116.50.128.0', end: '116.50.255.255' },
        { start: '116.197.0.0', end: '116.197.255.255' },
        { start: '118.200.0.0', end: '118.201.255.255' },
        { start: '119.8.0.0', end: '119.15.255.255' },
        { start: '119.31.224.0', end: '119.31.255.255' },
        { start: '119.56.0.0', end: '119.63.255.255' },
        { start: '119.74.0.0', end: '119.75.255.255' },
        { start: '121.6.0.0', end: '121.7.255.255' },
        { start: '128.106.0.0', end: '128.106.255.255' },
        { start: '129.126.0.0', end: '129.126.255.255' },
        { start: '132.147.0.0', end: '132.147.255.255' },
        { start: '137.132.0.0', end: '137.132.255.255' },
        { start: '139.59.128.0', end: '139.59.255.255' },
        { start: '152.32.0.0', end: '152.63.255.255' },
        { start: '160.96.0.0', end: '160.96.255.255' },
        { start: '165.21.0.0', end: '165.21.255.255' },
        { start: '167.99.128.0', end: '167.99.255.255' },
        { start: '175.156.0.0', end: '175.159.255.255' },
        { start: '180.129.0.0', end: '180.129.255.255' },
        { start: '180.210.128.0', end: '180.210.255.255' },
        { start: '180.214.160.0', end: '180.214.191.255' },
        { start: '180.222.0.0', end: '180.222.255.255' },
        { start: '182.16.0.0', end: '182.16.255.255' },
        { start: '182.23.0.0', end: '182.23.255.255' },
        { start: '182.55.0.0', end: '182.55.255.255' },
        { start: '183.90.0.0', end: '183.90.255.255' },
        { start: '202.12.0.0', end: '202.12.255.255' },
        { start: '202.21.128.0', end: '202.21.255.255' },
        { start: '202.27.16.0', end: '202.27.31.255' },
        { start: '202.42.0.0', end: '202.42.255.255' },
        { start: '202.55.64.0', end: '202.55.95.255' },
        { start: '202.56.128.0', end: '202.56.255.255' },
        { start: '202.58.128.0', end: '202.58.255.255' },
        { start: '202.74.0.0', end: '202.74.255.255' },
        { start: '202.79.160.0', end: '202.79.191.255' },
        { start: '202.150.192.0', end: '202.150.223.255' },
        { start: '202.157.128.0', end: '202.157.255.255' },
        { start: '202.160.0.0', end: '202.160.255.255' },
        { start: '203.92.64.0', end: '203.92.95.255' },
        { start: '203.116.0.0', end: '203.116.255.255' },
        { start: '203.120.0.0', end: '203.120.255.255' },
        { start: '203.125.0.0', end: '203.125.255.255' },
        { start: '203.126.0.0', end: '203.126.255.255' },
        { start: '203.127.0.0', end: '203.127.255.255' },
        { start: '203.142.0.0', end: '203.142.255.255' },
        { start: '203.175.128.0', end: '203.175.255.255' },
        { start: '203.208.0.0', end: '203.208.255.255' },
        { start: '218.186.0.0', end: '218.186.255.255' },
        { start: '218.212.0.0', end: '218.212.255.255' },
        { start: '220.255.0.0', end: '220.255.255.255' },
        { start: '221.120.0.0', end: '221.120.255.255' },
        { start: '223.25.0.0', end: '223.25.255.255' },
      ],
      // Vietnam IP ranges
      'VN': [
        { start: '1.52.0.0', end: '1.55.255.255' },
        { start: '14.0.16.0', end: '14.0.31.255' },
        { start: '14.160.0.0', end: '14.191.255.255' },
        { start: '14.224.0.0', end: '14.255.255.255' },
        { start: '27.0.12.0', end: '27.0.15.255' },
        { start: '27.2.0.0', end: '27.2.255.255' },
        { start: '27.3.0.0', end: '27.3.255.255' },
        { start: '27.64.0.0', end: '27.79.255.255' },
        { start: '27.118.16.0', end: '27.118.31.255' },
        { start: '31.13.224.0', end: '31.13.255.255' },
        { start: '42.1.0.0', end: '42.1.255.255' },
        { start: '42.96.0.0', end: '42.111.255.255' },
        { start: '42.112.0.0', end: '42.127.255.255' },
        { start: '42.201.0.0', end: '42.201.255.255' },
        { start: '43.239.52.0', end: '43.239.55.255' },
        { start: '45.117.76.0', end: '45.117.79.255' },
        { start: '45.117.80.0', end: '45.117.83.255' },
        { start: '45.117.84.0', end: '45.117.87.255' },
        { start: '45.122.240.0', end: '45.122.243.255' },
        { start: '45.125.224.0', end: '45.125.227.255' },
        { start: '45.125.236.0', end: '45.125.239.255' },
        { start: '58.186.0.0', end: '58.187.255.255' },
        { start: '59.153.0.0', end: '59.153.255.255' },
        { start: '61.11.0.0', end: '61.11.255.255' },
        { start: '61.28.224.0', end: '61.28.255.255' },
        { start: '101.53.0.0', end: '101.53.255.255' },
        { start: '101.96.0.0', end: '101.96.255.255' },
        { start: '101.99.0.0', end: '101.99.255.255' },
        { start: '103.1.200.0', end: '103.1.203.255' },
        { start: '103.3.244.0', end: '103.3.247.255' },
        { start: '103.9.76.0', end: '103.9.79.255' },
        { start: '103.9.86.0', end: '103.9.87.255' },
        { start: '103.10.44.0', end: '103.10.47.255' },
        { start: '103.19.164.0', end: '103.19.167.255' },
        { start: '103.20.96.0', end: '103.20.99.255' },
        { start: '103.21.120.0', end: '103.21.123.255' },
        { start: '103.23.144.0', end: '103.23.147.255' },
        { start: '103.28.36.0', end: '103.28.39.255' },
        { start: '103.31.120.0', end: '103.31.123.255' },
        { start: '103.37.28.0', end: '103.37.31.255' },
        { start: '103.48.76.0', end: '103.48.79.255' },
        { start: '103.48.80.0', end: '103.48.83.255' },
        { start: '103.48.184.0', end: '103.48.187.255' },
        { start: '103.53.88.0', end: '103.53.91.255' },
        { start: '103.57.104.0', end: '103.57.107.255' },
        { start: '103.57.220.0', end: '103.57.223.255' },
        { start: '103.61.44.0', end: '103.61.47.255' },
        { start: '103.61.48.0', end: '103.61.51.255' },
        { start: '103.68.80.0', end: '103.68.83.255' },
        { start: '103.69.184.0', end: '103.69.187.255' },
        { start: '103.70.28.0', end: '103.70.31.255' },
        { start: '103.70.168.0', end: '103.70.171.255' },
        { start: '103.72.96.0', end: '103.72.99.255' },
        { start: '103.77.168.0', end: '103.77.171.255' },
        { start: '103.79.140.0', end: '103.79.143.255' },
        { start: '103.88.108.0', end: '103.88.111.255' },
        { start: '103.88.112.0', end: '103.88.115.255' },
        { start: '103.92.24.0', end: '103.92.27.255' },
        { start: '103.94.16.0', end: '103.94.19.255' },
        { start: '103.101.28.0', end: '103.101.31.255' },
        { start: '103.102.160.0', end: '103.102.163.255' },
        { start: '103.104.28.0', end: '103.104.31.255' },
        { start: '103.104.120.0', end: '103.104.123.255' },
        { start: '103.106.220.0', end: '103.106.223.255' },
        { start: '103.107.192.0', end: '103.107.195.255' },
        { start: '103.108.92.0', end: '103.108.95.255' },
        { start: '103.109.28.0', end: '103.109.31.255' },
        { start: '103.110.168.0', end: '103.110.171.255' },
        { start: '103.111.236.0', end: '103.111.239.255' },
        { start: '103.112.60.0', end: '103.112.63.255' },
        { start: '103.112.124.0', end: '103.112.127.255' },
        { start: '103.113.80.0', end: '103.113.83.255' },
        { start: '103.114.104.0', end: '103.114.107.255' },
        { start: '103.116.52.0', end: '103.116.55.255' },
        { start: '103.117.240.0', end: '103.117.243.255' },
        { start: '103.120.76.0', end: '103.120.79.255' },
        { start: '103.121.88.0', end: '103.121.91.255' },
        { start: '103.124.92.0', end: '103.124.95.255' },
        { start: '103.130.216.0', end: '103.130.219.255' },
        { start: '103.137.184.0', end: '103.137.187.255' },
        { start: '103.138.120.0', end: '103.138.123.255' },
        { start: '103.141.140.0', end: '103.141.143.255' },
        { start: '103.149.28.0', end: '103.149.31.255' },
        { start: '103.152.110.0', end: '103.152.111.255' },
        { start: '103.153.216.0', end: '103.153.219.255' },
        { start: '103.155.172.0', end: '103.155.175.255' },
        { start: '103.156.80.0', end: '103.156.83.255' },
        { start: '103.160.60.0', end: '103.160.63.255' },
        { start: '103.161.100.0', end: '103.161.103.255' },
        { start: '103.163.80.0', end: '103.163.83.255' },
        { start: '103.164.76.0', end: '103.164.79.255' },
        { start: '103.165.120.0', end: '103.165.123.255' },
        { start: '103.166.120.0', end: '103.166.123.255' },
        { start: '103.167.24.0', end: '103.167.27.255' },
        { start: '103.168.52.0', end: '103.168.55.255' },
        { start: '103.170.118.0', end: '103.170.119.255' },
        { start: '103.171.28.0', end: '103.171.31.255' },
        { start: '103.172.78.0', end: '103.172.79.255' },
        { start: '103.173.66.0', end: '103.173.67.255' },
        { start: '103.175.80.0', end: '103.175.83.255' },
        { start: '103.176.140.0', end: '103.176.143.255' },
        { start: '103.177.188.0', end: '103.177.191.255' },
        { start: '103.178.100.0', end: '103.178.103.255' },
        { start: '103.179.168.0', end: '103.179.171.255' },
        { start: '103.180.120.0', end: '103.180.123.255' },
        { start: '103.181.120.0', end: '103.181.123.255' },
        { start: '103.182.164.0', end: '103.182.167.255' },
        { start: '103.183.108.0', end: '103.183.111.255' },
        { start: '103.184.112.0', end: '103.184.115.255' },
        { start: '103.185.232.0', end: '103.185.235.255' },
        { start: '103.186.64.0', end: '103.186.67.255' },
        { start: '103.187.0.0', end: '103.187.3.255' },
        { start: '103.188.20.0', end: '103.188.23.255' },
        { start: '103.189.76.0', end: '103.189.79.255' },
        { start: '103.190.40.0', end: '103.190.43.255' },
        { start: '103.191.20.0', end: '103.191.23.255' },
        { start: '103.192.236.0', end: '103.192.239.255' },
        { start: '103.194.188.0', end: '103.194.191.255' },
        { start: '103.195.236.0', end: '103.195.239.255' },
        { start: '103.196.16.0', end: '103.196.19.255' },
        { start: '103.196.144.0', end: '103.196.147.255' },
        { start: '103.197.112.0', end: '103.197.115.255' },
        { start: '103.199.136.0', end: '103.199.139.255' },
        { start: '103.200.20.0', end: '103.200.23.255' },
        { start: '103.200.24.0', end: '103.200.27.255' },
        { start: '103.205.96.0', end: '103.205.99.255' },
        { start: '103.205.100.0', end: '103.205.103.255' },
        { start: '103.205.104.0', end: '103.205.107.255' },
        { start: '103.206.216.0', end: '103.206.219.255' },
        { start: '103.207.32.0', end: '103.207.35.255' },
        { start: '103.207.36.0', end: '103.207.39.255' },
        { start: '103.207.40.0', end: '103.207.43.255' },
        { start: '103.211.200.0', end: '103.211.203.255' },
        { start: '103.211.212.0', end: '103.211.215.255' },
        { start: '103.212.28.0', end: '103.212.31.255' },
        { start: '103.213.120.0', end: '103.213.123.255' },
        { start: '103.214.100.0', end: '103.214.103.255' },
        { start: '103.215.120.0', end: '103.215.123.255' },
        { start: '103.216.112.0', end: '103.216.115.255' },
        { start: '103.216.120.0', end: '103.216.123.255' },
        { start: '103.217.268.0', end: '103.217.271.255' },
        { start: '103.218.120.0', end: '103.218.123.255' },
        { start: '103.218.164.0', end: '103.218.167.255' },
        { start: '103.219.64.0', end: '103.219.67.255' },
        { start: '103.220.68.0', end: '103.220.71.255' },
        { start: '103.220.96.0', end: '103.220.99.255' },
        { start: '103.221.88.0', end: '103.221.91.255' },
        { start: '103.221.120.0', end: '103.221.123.255' },
        { start: '103.221.212.0', end: '103.221.215.255' },
        { start: '103.222.236.0', end: '103.222.239.255' },
        { start: '103.224.168.0', end: '103.224.171.255' },
        { start: '103.226.248.0', end: '103.226.251.255' },
        { start: '103.227.28.0', end: '103.227.31.255' },
        { start: '103.228.20.0', end: '103.228.23.255' },
        { start: '103.229.40.0', end: '103.229.43.255' },
        { start: '103.229.192.0', end: '103.229.195.255' },
        { start: '103.230.152.0', end: '103.230.155.255' },
        { start: '103.231.60.0', end: '103.231.63.255' },
        { start: '103.232.52.0', end: '103.232.55.255' },
        { start: '103.232.56.0', end: '103.232.59.255' },
        { start: '103.232.60.0', end: '103.232.63.255' },
        { start: '103.232.120.0', end: '103.232.123.255' },
        { start: '103.233.48.0', end: '103.233.51.255' },
        { start: '103.234.36.0', end: '103.234.39.255' },
        { start: '103.234.88.0', end: '103.234.91.255' },
        { start: '103.235.208.0', end: '103.235.211.255' },
        { start: '103.237.64.0', end: '103.237.67.255' },
        { start: '103.237.96.0', end: '103.237.99.255' },
        { start: '103.238.68.0', end: '103.238.71.255' },
        { start: '103.238.208.0', end: '103.238.211.255' },
        { start: '103.239.116.0', end: '103.239.119.255' },
        { start: '103.240.0.0', end: '103.243.255.255' },
        { start: '103.244.236.0', end: '103.244.239.255' },
        { start: '103.245.244.0', end: '103.245.247.255' },
        { start: '103.246.220.0', end: '103.246.223.255' },
        { start: '103.248.120.0', end: '103.248.123.255' },
        { start: '103.249.20.0', end: '103.249.23.255' },
        { start: '103.249.100.0', end: '103.249.103.255' },
        { start: '103.249.200.0', end: '103.249.203.255' },
        { start: '103.250.24.0', end: '103.250.27.255' },
        { start: '103.250.232.0', end: '103.250.235.255' },
        { start: '103.251.236.0', end: '103.251.239.255' },
        { start: '103.252.0.0', end: '103.252.3.255' },
        { start: '103.252.252.0', end: '103.252.255.255' },
        { start: '103.253.88.0', end: '103.253.91.255' },
        { start: '103.254.12.0', end: '103.254.15.255' },
        { start: '110.35.0.0', end: '110.35.255.255' },
        { start: '110.44.184.0', end: '110.44.191.255' },
        { start: '111.65.0.0', end: '111.65.255.255' },
        { start: '111.91.232.0', end: '111.91.239.255' },
        { start: '111.92.232.0', end: '111.92.239.255' },
        { start: '113.160.0.0', end: '113.191.255.255' },
        { start: '113.176.0.0', end: '113.191.255.255' },
        { start: '113.190.232.0', end: '113.190.239.255' },
        { start: '115.72.0.0', end: '115.79.255.255' },
        { start: '115.84.176.0', end: '115.84.183.255' },
        { start: '116.96.0.0', end: '116.111.255.255' },
        { start: '116.97.240.0', end: '116.97.247.255' },
        { start: '116.102.0.0', end: '116.103.255.255' },
        { start: '116.103.16.0', end: '116.103.23.255' },
        { start: '116.118.0.0', end: '116.119.255.255' },
        { start: '117.0.0.0', end: '117.7.255.255' },
        { start: '117.4.0.0', end: '117.7.255.255' },
        { start: '118.68.0.0', end: '118.71.255.255' },
        { start: '118.69.64.0', end: '118.69.127.255' },
        { start: '118.70.0.0', end: '118.70.255.255' },
        { start: '118.99.0.0', end: '118.99.255.255' },
        { start: '119.15.160.0', end: '119.15.191.255' },
        { start: '119.17.192.0', end: '119.17.255.255' },
        { start: '119.18.136.0', end: '119.18.143.255' },
        { start: '120.72.0.0', end: '120.72.255.255' },
        { start: '121.100.0.0', end: '121.100.255.255' },
        { start: '123.16.0.0', end: '123.31.255.255' },
        { start: '123.20.0.0', end: '123.23.255.255' },
        { start: '123.24.0.0', end: '123.31.255.255' },
        { start: '123.25.0.0', end: '123.25.255.255' },
        { start: '125.212.128.0', end: '125.212.255.255' },
        { start: '125.214.0.0', end: '125.215.255.255' },
        { start: '125.235.0.0', end: '125.235.255.255' },
        { start: '128.90.0.0', end: '128.90.255.255' },
        { start: '130.140.0.0', end: '130.140.255.255' },
        { start: '134.159.0.0', end: '134.159.255.255' },
        { start: '137.59.120.0', end: '137.59.127.255' },
        { start: '139.99.0.0', end: '139.99.255.255' },
        { start: '14.160.0.0', end: '14.191.255.255' },
        { start: '14.224.0.0', end: '14.255.255.255' },
        { start: '140.0.0.0', end: '140.255.255.255' },
        { start: '150.95.104.0', end: '150.95.111.255' },
        { start: '150.95.112.0', end: '150.95.119.255' },
        { start: '150.95.120.0', end: '150.95.127.255' },
        { start: '150.95.128.0', end: '150.95.255.255' },
        { start: '157.119.64.0', end: '157.119.127.255' },
        { start: '157.119.240.0', end: '157.119.255.255' },
        { start: '171.224.0.0', end: '171.255.255.255' },
        { start: '175.103.64.0', end: '175.103.127.255' },
        { start: '175.106.0.0', end: '175.106.255.255' },
        { start: '180.93.0.0', end: '180.93.255.255' },
        { start: '183.80.0.0', end: '183.95.255.255' },
        { start: '183.81.0.0', end: '183.81.255.255' },
        { start: '183.91.0.0', end: '183.91.255.255' },
        { start: '185.132.240.0', end: '185.132.243.255' },
        { start: '202.0.0.0', end: '202.255.255.255' },
        { start: '202.6.96.0', end: '202.6.111.255' },
        { start: '202.8.0.0', end: '202.8.255.255' },
        { start: '202.9.0.0', end: '202.9.255.255' },
        { start: '202.47.0.0', end: '202.47.255.255' },
        { start: '202.55.0.0', end: '202.55.255.255' },
        { start: '202.74.0.0', end: '202.74.255.255' },
        { start: '202.78.0.0', end: '202.78.255.255' },
        { start: '202.87.0.0', end: '202.87.255.255' },
        { start: '202.123.0.0', end: '202.123.255.255' },
        { start: '202.143.0.0', end: '202.143.255.255' },
        { start: '202.151.160.0', end: '202.151.191.255' },
        { start: '202.160.0.0', end: '202.160.255.255' },
        { start: '202.172.0.0', end: '202.172.255.255' },
        { start: '202.191.0.0', end: '202.191.255.255' },
        { start: '203.8.0.0', end: '203.8.255.255' },
        { start: '203.34.0.0', end: '203.34.255.255' },
        { start: '203.59.0.0', end: '203.59.255.255' },
        { start: '203.76.0.0', end: '203.76.255.255' },
        { start: '203.77.0.0', end: '203.77.255.255' },
        { start: '203.99.0.0', end: '203.99.255.255' },
        { start: '203.113.128.0', end: '203.113.255.255' },
        { start: '203.119.0.0', end: '203.119.255.255' },
        { start: '203.128.0.0', end: '203.128.255.255' },
        { start: '203.129.0.0', end: '203.129.255.255' },
        { start: '203.130.0.0', end: '203.130.255.255' },
        { start: '203.162.0.0', end: '203.162.255.255' },
        { start: '203.171.0.0', end: '203.171.255.255' },
        { start: '203.176.0.0', end: '203.176.255.255' },
        { start: '203.189.0.0', end: '203.189.255.255' },
        { start: '203.190.0.0', end: '203.190.255.255' },
        { start: '203.191.0.0', end: '203.191.255.255' },
        { start: '203.201.0.0', end: '203.201.255.255' },
        { start: '203.205.0.0', end: '203.205.255.255' },
        { start: '203.210.128.0', end: '203.210.255.255' },
        { start: '203.223.0.0', end: '203.223.255.255' },
        { start: '210.2.0.0', end: '210.2.255.255' },
        { start: '210.86.224.0', end: '210.86.255.255' },
        { start: '210.245.0.0', end: '210.245.255.255' },
        { start: '218.100.0.0', end: '218.100.255.255' },
        { start: '220.231.64.0', end: '220.231.127.255' },
        { start: '221.121.128.0', end: '221.121.255.255' },
        { start: '222.252.0.0', end: '222.255.255.255' },
        { start: '223.27.128.0', end: '223.27.255.255' },
        { start: '223.29.192.0', end: '223.29.255.255' },
        { start: '223.130.0.0', end: '223.130.255.255' },
        { start: '223.165.0.0', end: '223.165.255.255' },
        { start: '223.223.128.0', end: '223.223.255.255' },
      ],
    };
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get value from cache
   * @private
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/not found
   */
  _getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache with TTL
   * @private
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - TTL in milliseconds
   */
  _setCache(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Generate cache key
   * @private
   * @param {...string} parts - Key parts
   * @returns {string} Cache key
   */
  _cacheKey(...parts) {
    return parts.join(':');
  }

  /**
   * Clear all cached region configs
   */
  clearCache() {
    this.cache.clear();
    console.log('Region config cache cleared');
  }

  /**
   * Preload common region configs into cache
   * @returns {Promise<void>}
   */
  async warmCache() {
    try {
      // Preload all active regions
      const activeRegions = await this.getActiveRegions();
      for (const region of activeRegions) {
        this._setCache(this._cacheKey('region', region.code), region, 30 * 60 * 1000);
      }

      console.log('Region config cache warmed successfully');
    } catch (error) {
      console.error('Error warming region config cache:', error);
    }
  }

  // ==================== IP UTILITIES ====================

  /**
   * Convert IP address to numeric value for comparison
   * @private
   * @param {string} ip - IP address
   * @returns {number} Numeric representation
   */
  _ipToNumber(ip) {
    const parts = ip.split('.');
    return (parseInt(parts[0], 10) * 256 * 256 * 256) +
           (parseInt(parts[1], 10) * 256 * 256) +
           (parseInt(parts[2], 10) * 256) +
           parseInt(parts[3], 10);
  }

  /**
   * Check if IP is in a range
   * @private
   * @param {string} ip - IP address to check
   * @param {string} start - Range start
   * @param {string} end - Range end
   * @returns {boolean} True if IP is in range
   */
  _isIpInRange(ip, start, end) {
    const ipNum = this._ipToNumber(ip);
    const startNum = this._ipToNumber(start);
    const endNum = this._ipToNumber(end);
    return ipNum >= startNum && ipNum <= endNum;
  }

  /**
   * Get client IP from request
   * @private
   * @param {Object} req - Express request object
   * @returns {string|null} Client IP address
   */
  _getClientIP(req) {
    // Check for forwarded IP (behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Check other headers
    const realIP = req.headers['x-real-ip'] ||
                   req.headers['cf-connecting-ip'] ||
                   req.headers['true-client-ip'];
    if (realIP) {
      return realIP;
    }

    // Fall back to connection remote address
    return req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           null;
  }

  // ==================== REGION DETECTION ====================

  /**
   * Detect region from IP address
   * @param {string} ipAddress - IP address to detect region from
   * @returns {Promise<string|null>} Region code or null if not detected
   */
  async detectRegionFromIP(ipAddress) {
    try {
      if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
        return this.defaultRegion;
      }

      // Check if IPv6 and convert to IPv4 if possible, or skip
      if (ipAddress.includes(':')) {
        // IPv6 localhost or loopback
        if (ipAddress === '::1' || ipAddress.startsWith('::ffff:127.')) {
          return this.defaultRegion;
        }
        // Try to extract IPv4 from IPv6 mapped address
        if (ipAddress.startsWith('::ffff:')) {
          ipAddress = ipAddress.substring(7);
        } else {
          // Cannot determine region from IPv6, use default
          return this.defaultRegion;
        }
      }

      // Check against known IP ranges
      for (const [regionCode, ranges] of Object.entries(this.ipRegionMap)) {
        for (const range of ranges) {
          if (this._isIpInRange(ipAddress, range.start, range.end)) {
            return regionCode;
          }
        }
      }

      // If no match found, return default
      return this.defaultRegion;
    } catch (error) {
      console.error('Error detecting region from IP:', error);
      return this.defaultRegion;
    }
  }

  /**
   * Detect region from request headers and IP
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Detection result with region code and method
   */
  async detectRegionFromRequest(req) {
    try {
      // 1. Check for explicit region header
      const regionHeader = req.headers['x-region-code'] || req.headers['x-region'];
      if (regionHeader && this.supportedRegions.includes(regionHeader.toUpperCase())) {
        return {
          regionCode: regionHeader.toUpperCase(),
          method: 'header',
          confidence: 'high',
        };
      }

      // 2. Check Accept-Language header for region hints
      const acceptLanguage = req.headers['accept-language'];
      if (acceptLanguage) {
        const langRegion = this._parseAcceptLanguage(acceptLanguage);
        if (langRegion && this.supportedRegions.includes(langRegion)) {
          return {
            regionCode: langRegion,
            method: 'language',
            confidence: 'medium',
          };
        }
      }

      // 3. Check Cloudflare country header
      const cfCountry = req.headers['cf-ipcountry'];
      if (cfCountry && this.supportedRegions.includes(cfCountry.toUpperCase())) {
        return {
          regionCode: cfCountry.toUpperCase(),
          method: 'cloudflare',
          confidence: 'high',
        };
      }

      // 4. Detect from IP address
      const clientIP = this._getClientIP(req);
      if (clientIP) {
        const ipRegion = await this.detectRegionFromIP(clientIP);
        if (ipRegion) {
          return {
            regionCode: ipRegion,
            method: 'ip',
            confidence: 'medium',
          };
        }
      }

      // 5. Fall back to default
      return {
        regionCode: this.defaultRegion,
        method: 'default',
        confidence: 'low',
      };
    } catch (error) {
      console.error('Error detecting region from request:', error);
      return {
        regionCode: this.defaultRegion,
        method: 'default',
        confidence: 'low',
        error: error.message,
      };
    }
  }

  /**
   * Parse Accept-Language header for region
   * @private
   * @param {string} acceptLanguage - Accept-Language header value
   * @returns {string|null} Region code or null
   */
  _parseAcceptLanguage(acceptLanguage) {
    if (!acceptLanguage) return null;

    const regionMap = {
      'my': 'MM',
      'my-MM': 'MM',
      'th': 'TH',
      'th-TH': 'TH',
      'en-SG': 'SG',
      'vi': 'VN',
      'vi-VN': 'VN',
    };

    const languages = acceptLanguage.split(',');
    for (const lang of languages) {
      const code = lang.split(';')[0].trim().toLowerCase();
      if (regionMap[code]) {
        return regionMap[code];
      }
    }

    return null;
  }

  /**
   * Get user's saved region preference
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Region code or null
   */
  async getRegionFromUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('regionCode regionPreference').lean();
      if (!user) {
        return null;
      }

      return user.regionCode || user.regionPreference || null;
    } catch (error) {
      console.error('Error getting user region preference:', error);
      return null;
    }
  }

  /**
   * Save user's region preference
   * @param {string} userId - User ID
   * @param {string} regionCode - Region code to save
   * @returns {Promise<Object>} Update result
   */
  async setUserRegion(userId, regionCode) {
    try {
      const normalizedCode = regionCode.toUpperCase();

      // Validate region code
      if (!this.supportedRegions.includes(normalizedCode)) {
        throw new Error(`Unsupported region code: ${regionCode}`);
      }

      // Check if region is active
      const regionConfig = await this.getRegionConfig(normalizedCode);
      if (!regionConfig) {
        throw new Error(`Region configuration not found: ${regionCode}`);
      }

      if (regionConfig.status !== 'active') {
        throw new Error(`Region ${regionCode} is not active`);
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          regionCode: normalizedCode,
          regionPreference: normalizedCode,
          regionUpdatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        regionCode: normalizedCode,
        userId: user._id,
      };
    } catch (error) {
      console.error('Error setting user region:', error);
      throw error;
    }
  }

  // ==================== REGION CONFIGURATION ====================

  /**
   * Get full configuration for a region
   * @param {string} regionCode - Region code (e.g., 'MM', 'TH')
   * @returns {Promise<Object|null>} Region configuration or null
   */
  async getRegionConfig(regionCode) {
    try {
      const normalizedCode = regionCode.toUpperCase();
      const cacheKey = this._cacheKey('region', normalizedCode);

      // Check cache first
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const config = await RegionConfig.getByCode(normalizedCode);

      if (config) {
        // Cache the result
        this._setCache(cacheKey, config, 30 * 60 * 1000);
      }

      return config;
    } catch (error) {
      console.error('Error getting region config:', error);
      return null;
    }
  }

  /**
   * Get all active regions
   * @returns {Promise<Array>} Array of active region configurations
   */
  async getActiveRegions() {
    try {
      const cacheKey = this._cacheKey('regions', 'active');

      // Check cache first
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const regions = await RegionConfig.getActiveRegions();

      // Cache the result
      this._setCache(cacheKey, regions, 30 * 60 * 1000);

      return regions;
    } catch (error) {
      console.error('Error getting active regions:', error);
      return [];
    }
  }

  /**
   * Get regions by status
   * @param {string} status - Status filter ('active', 'preparing', 'inactive', 'suspended')
   * @returns {Promise<Array>} Array of region configurations
   */
  async getRegionsByStatus(status) {
    try {
      const cacheKey = this._cacheKey('regions', 'status', status);

      // Check cache first
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const regions = await RegionConfig.find({ status }).lean();

      // Cache the result
      this._setCache(cacheKey, regions, 30 * 60 * 1000);

      return regions;
    } catch (error) {
      console.error('Error getting regions by status:', error);
      return [];
    }
  }

  /**
   * Create new region configuration
   * @param {Object} configData - Region configuration data
   * @returns {Promise<Object>} Created region configuration
   */
  async createRegionConfig(configData) {
    try {
      // Validate required fields
      if (!configData.code || !configData.name || !configData.defaultCurrency || !configData.timezone) {
        throw new Error('Missing required fields: code, name, defaultCurrency, timezone');
      }

      // Normalize code
      configData.code = configData.code.toUpperCase();

      // Check if region already exists
      const existing = await RegionConfig.findOne({ code: configData.code });
      if (existing) {
        throw new Error(`Region ${configData.code} already exists`);
      }

      // Create region config
      const regionConfig = new RegionConfig(configData);
      await regionConfig.save();

      // Clear cache for active regions
      this.cache.delete(this._cacheKey('regions', 'active'));
      this.cache.delete(this._cacheKey('regions', 'status', configData.status));

      return regionConfig.toObject();
    } catch (error) {
      console.error('Error creating region config:', error);
      throw error;
    }
  }

  /**
   * Update region configuration
   * @param {string} regionCode - Region code to update
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated region configuration
   */
  async updateRegionConfig(regionCode, updates) {
    try {
      const normalizedCode = regionCode.toUpperCase();

      // Prevent changing the code
      if (updates.code) {
        delete updates.code;
      }

      // Add updated timestamp
      updates.updatedAt = new Date();

      const regionConfig = await RegionConfig.findOneAndUpdate(
        { code: normalizedCode },
        updates,
        { new: true, runValidators: true }
      );

      if (!regionConfig) {
        throw new Error(`Region ${regionCode} not found`);
      }

      // Clear cache
      this.cache.delete(this._cacheKey('region', normalizedCode));
      this.cache.delete(this._cacheKey('regions', 'active'));
      if (updates.status) {
        this.cache.delete(this._cacheKey('regions', 'status', updates.status));
      }

      return regionConfig.toObject();
    } catch (error) {
      console.error('Error updating region config:', error);
      throw error;
    }
  }

  // ==================== LANGUAGE MANAGEMENT ====================

  /**
   * Get supported languages for a region
   * @param {string} regionCode - Region code
   * @returns {Promise<Array>} Array of language configurations
   */
  async getSupportedLanguages(regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config || !config.languages) {
        return [];
      }

      return config.languages.filter(lang => lang.isActive);
    } catch (error) {
      console.error('Error getting supported languages:', error);
      return [];
    }
  }

  /**
   * Get default language for a region
   * @param {string} regionCode - Region code
   * @returns {Promise<Object|null>} Default language configuration
   */
  async getDefaultLanguage(regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config || !config.languages) {
        return null;
      }

      // Find default language
      const defaultLang = config.languages.find(lang => lang.isDefault && lang.isActive);
      if (defaultLang) {
        return defaultLang;
      }

      // Fall back to first active language
      const firstActive = config.languages.find(lang => lang.isActive);
      return firstActive || null;
    } catch (error) {
      console.error('Error getting default language:', error);
      return null;
    }
  }

  /**
   * Check if language is supported in a region
   * @param {string} regionCode - Region code
   * @param {string} languageCode - Language code to check
   * @returns {Promise<boolean>} True if language is supported
   */
  async isLanguageSupported(regionCode, languageCode) {
    try {
      const languages = await this.getSupportedLanguages(regionCode);
      return languages.some(lang => 
        lang.code.toLowerCase() === languageCode.toLowerCase() && lang.isActive
      );
    } catch (error) {
      console.error('Error checking language support:', error);
      return false;
    }
  }

  // ==================== PAYMENT PROVIDERS ====================

  /**
   * Get payment providers for a region
   * @param {string} regionCode - Region code
   * @param {string} [currency=null] - Optional currency filter
   * @returns {Promise<Array>} Array of payment provider configurations
   */
  async getPaymentProviders(regionCode, currency = null) {
    try {
      const normalizedCurrency = currency ? currency.toUpperCase() : null;
      const cacheKey = this._cacheKey('providers', regionCode.toUpperCase(), normalizedCurrency || 'all');

      // Check cache first
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database using static method
      const providers = await RegionConfig.getPaymentProviders(regionCode, normalizedCurrency);

      // Cache the result
      this._setCache(cacheKey, providers, 15 * 60 * 1000);

      return providers;
    } catch (error) {
      console.error('Error getting payment providers:', error);
      return [];
    }
  }

  /**
   * Get only active payment providers for a region
   * @param {string} regionCode - Region code
   * @returns {Promise<Array>} Array of active payment provider configurations
   */
  async getActivePaymentProviders(regionCode) {
    try {
      const providers = await this.getPaymentProviders(regionCode);
      return providers.filter(provider => provider.isActive);
    } catch (error) {
      console.error('Error getting active payment providers:', error);
      return [];
    }
  }

  // ==================== COMPLIANCE & FEATURES ====================

  /**
   * Get compliance requirements for a region
   * @param {string} regionCode - Region code
   * @returns {Promise<Array>} Array of compliance requirements
   */
  async getComplianceRequirements(regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config) {
        return [];
      }

      return config.compliance || [];
    } catch (error) {
      console.error('Error getting compliance requirements:', error);
      return [];
    }
  }

  /**
   * Check if a feature is enabled for a region
   * @param {string} regionCode - Region code
   * @param {string} feature - Feature name (e.g., 'referrals', 'payouts', 'kyc')
   * @returns {Promise<boolean>} True if feature is enabled
   */
  async isFeatureEnabled(regionCode, feature) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config || !config.features) {
        return false;
      }

      return config.features[feature] === true;
    } catch (error) {
      console.error('Error checking feature enabled:', error);
      return false;
    }
  }

  /**
   * Get referral limits for a region
   * @param {string} regionCode - Region code
   * @returns {Promise<Object>} Referral limits configuration
   */
  async getReferralLimits(regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config || !config.referralLimits) {
        return {
          maxPayoutAmount: null,
          minPayoutAmount: 0,
          dailyReferralLimit: null,
        };
      }

      return config.referralLimits;
    } catch (error) {
      console.error('Error getting referral limits:', error);
      return {
        maxPayoutAmount: null,
        minPayoutAmount: 0,
        dailyReferralLimit: null,
      };
    }
  }

  // ==================== REGIONAL DATA ====================

  /**
   * Get all settings for frontend
   * @param {string} regionCode - Region code
   * @returns {Promise<Object>} Regional settings for frontend
   */
  async getRegionalSettings(regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config) {
        return null;
      }

      // Return sanitized settings for frontend
      return {
        code: config.code,
        name: config.name,
        localName: config.localName,
        status: config.status,
        defaultCurrency: config.defaultCurrency,
        supportedCurrencies: config.supportedCurrencies,
        timezone: config.timezone,
        dateFormat: config.dateFormat,
        timeFormat: config.timeFormat,
        numberFormat: config.numberFormat,
        languages: config.languages?.filter(lang => lang.isActive) || [],
        phoneFormat: config.phoneFormat,
        features: config.features,
        referralLimits: config.referralLimits,
        paymentProviders: config.paymentProviders
          ?.filter(p => p.isActive)
          ?.map(p => ({
            provider: p.provider,
            code: p.code,
            supportedCurrencies: p.supportedCurrencies,
            supportedMethods: p.supportedMethods,
            minAmount: p.minAmount,
            maxAmount: p.maxAmount,
            fees: p.fees,
            processingTime: p.processingTime,
          })) || [],
      };
    } catch (error) {
      console.error('Error getting regional settings:', error);
      return null;
    }
  }

  /**
   * Format phone number for region
   * @param {string} phoneNumber - Phone number to format
   * @param {string} regionCode - Region code
   * @returns {Promise<string>} Formatted phone number
   */
  async formatPhoneNumber(phoneNumber, regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config || !config.phoneFormat) {
        return phoneNumber;
      }

      const { countryCode, pattern } = config.phoneFormat;
      let cleaned = phoneNumber.replace(/\D/g, '');

      // Remove country code if present
      if (countryCode && cleaned.startsWith(countryCode.replace('+', ''))) {
        cleaned = cleaned.substring(countryCode.replace('+', '').length);
      }

      // Apply pattern if available
      if (pattern) {
        // Simple pattern application - replace X with digits
        let formatted = pattern;
        let digitIndex = 0;
        formatted = formatted.replace(/X/g, () => {
          return cleaned[digitIndex++] || '';
        });
        return formatted;
      }

      // Default formatting with country code
      if (countryCode && !phoneNumber.startsWith('+')) {
        return `${countryCode} ${cleaned}`;
      }

      return cleaned;
    } catch (error) {
      console.error('Error formatting phone number:', error);
      return phoneNumber;
    }
  }

  /**
   * Validate phone number format for region
   * @param {string} phoneNumber - Phone number to validate
   * @param {string} regionCode - Region code
   * @returns {Promise<Object>} Validation result
   */
  async validatePhoneNumber(phoneNumber, regionCode) {
    try {
      const config = await this.getRegionConfig(regionCode);
      if (!config || !config.phoneFormat) {
        return {
          valid: true,
          message: 'No validation rules for region',
        };
      }

      const { countryCode, pattern, example } = config.phoneFormat;
      let cleaned = phoneNumber.replace(/\D/g, '');

      // Remove country code for validation
      const countryCodeDigits = countryCode ? countryCode.replace('+', '') : '';
      if (countryCodeDigits && cleaned.startsWith(countryCodeDigits)) {
        cleaned = cleaned.substring(countryCodeDigits.length);
      }

      // Check length
      const minLength = 8;
      const maxLength = 11;

      if (cleaned.length < minLength) {
        return {
          valid: false,
          message: `Phone number too short. Minimum ${minLength} digits required.`,
          example: example || null,
        };
      }

      if (cleaned.length > maxLength) {
        return {
          valid: false,
          message: `Phone number too long. Maximum ${maxLength} digits allowed.`,
          example: example || null,
        };
      }

      // If pattern is provided, validate against it
      if (pattern) {
        const digitCount = (pattern.match(/X/g) || []).length;
        if (cleaned.length !== digitCount) {
          return {
            valid: false,
            message: `Phone number must be ${digitCount} digits`,
            example: example || null,
          };
        }
      }

      return {
        valid: true,
        message: 'Valid phone number',
        formatted: await this.formatPhoneNumber(phoneNumber, regionCode),
      };
    } catch (error) {
      console.error('Error validating phone number:', error);
      return {
        valid: false,
        message: 'Validation error: ' + error.message,
      };
    }
  }
}

// Create singleton instance
const regionService = new RegionService();

module.exports = regionService;
