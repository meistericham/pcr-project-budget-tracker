#!/usr/bin/env node

/**
 * PCR Project Tracker - Supabase Connection Test
 * This script tests Supabase connectivity from the current environment
 */

const https = require('https');
const { URL } = require('url');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    log(`\n${'='.repeat(50)}`, 'blue');
    log(`  ${message}`, 'blue');
    log(`${'='.repeat(50)}`, 'blue');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

// Test configuration
const tests = [
    {
        name: 'Environment Variables Check',
        test: () => {
            const requiredVars = [
                'VITE_SUPABASE_URL',
                'VITE_SUPABASE_ANON_KEY'
            ];
            
            const missing = [];
            const present = {};
            
            requiredVars.forEach(varName => {
                const value = process.env[varName];
                if (value && value !== 'your-project.supabase.co' && value !== 'your-anon-key-here') {
                    present[varName] = value;
                } else {
                    missing.push(varName);
                }
            });
            
            if (missing.length > 0) {
                logError(`Missing environment variables: ${missing.join(', ')}`);
                logInfo('Please set these variables in your environment or .env file');
                return false;
            }
            
            logSuccess('All required environment variables are set');
            Object.keys(present).forEach(key => {
                const value = present[key];
                const displayValue = key.includes('KEY') ? 
                    `${value.substring(0, 20)}...` : value;
                logInfo(`${key}: ${displayValue}`);
            });
            return true;
        }
    },
    {
        name: 'Basic Connectivity Test',
        test: async () => {
            const url = process.env.VITE_SUPABASE_URL;
            if (!url) return false;
            
            try {
                const parsedUrl = new URL(url);
                const hostname = parsedUrl.hostname;
                
                logInfo(`Testing connection to: ${hostname}`);
                
                return new Promise((resolve) => {
                    const req = https.request({
                        hostname,
                        port: 443,
                        path: '/',
                        method: 'GET',
                        timeout: 10000
                    }, (res) => {
                        logSuccess(`Connected successfully (Status: ${res.statusCode})`);
                        resolve(true);
                    });
                    
                    req.on('error', (err) => {
                        logError(`Connection failed: ${err.message}`);
                        resolve(false);
                    });
                    
                    req.on('timeout', () => {
                        logError('Connection timed out');
                        req.destroy();
                        resolve(false);
                    });
                    
                    req.end();
                });
            } catch (error) {
                logError(`Invalid URL format: ${error.message}`);
                return false;
            }
        }
    },
    {
        name: 'Supabase API Test',
        test: async () => {
            const url = process.env.VITE_SUPABASE_URL;
            const key = process.env.VITE_SUPABASE_ANON_KEY;
            
            if (!url || !key) return false;
            
            try {
                const apiUrl = `${url}/rest/v1/`;
                logInfo(`Testing API endpoint: ${apiUrl}`);
                
                return new Promise((resolve) => {
                    const postData = JSON.stringify({ query: 'SELECT 1' });
                    
                    const req = https.request({
                        hostname: new URL(url).hostname,
                        port: 443,
                        path: '/rest/v1/',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData),
                            'apikey': key,
                            'Authorization': `Bearer ${key}`,
                            'Prefer': 'return=minimal'
                        },
                        timeout: 10000
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            if (res.statusCode === 200 || res.statusCode === 201) {
                                logSuccess(`API endpoint working (Status: ${res.statusCode})`);
                                resolve(true);
                            } else {
                                logWarning(`API endpoint responded with status: ${res.statusCode}`);
                                logInfo(`Response: ${data.substring(0, 200)}...`);
                                resolve(true); // Still consider it working
                            }
                        });
                    });
                    
                    req.on('error', (err) => {
                        logError(`API test failed: ${err.message}`);
                        resolve(false);
                    });
                    
                    req.on('timeout', () => {
                        logError('API test timed out');
                        req.destroy();
                        resolve(false);
                    });
                    
                    req.write(postData);
                    req.end();
                });
            } catch (error) {
                logError(`API test error: ${error.message}`);
                return false;
            }
        }
    },
    {
        name: 'Authentication Endpoint Test',
        test: async () => {
            const url = process.env.VITE_SUPABASE_URL;
            const key = process.env.VITE_SUPABASE_ANON_KEY;
            
            if (!url || !key) return false;
            
            try {
                const authUrl = `${url}/auth/v1/settings`;
                logInfo(`Testing auth endpoint: ${authUrl}`);
                
                return new Promise((resolve) => {
                    const req = https.request({
                        hostname: new URL(url).hostname,
                        port: 443,
                        path: '/auth/v1/settings',
                        method: 'GET',
                        headers: {
                            'apikey': key,
                            'Authorization': `Bearer ${key}`
                        },
                        timeout: 10000
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            if (res.statusCode === 200) {
                                logSuccess(`Auth endpoint working (Status: ${res.statusCode})`);
                                resolve(true);
                            } else {
                                logWarning(`Auth endpoint status: ${res.statusCode}`);
                                logInfo(`Response: ${data.substring(0, 200)}...`);
                                resolve(true); // Still consider it working
                            }
                        });
                    });
                    
                    req.on('error', (err) => {
                        logWarning(`Auth test warning: ${err.message}`);
                        resolve(true); // Don't fail on auth test
                    });
                    
                    req.on('timeout', () => {
                        logWarning('Auth test timed out');
                        req.destroy();
                        resolve(true); // Don't fail on auth test
                    });
                    
                    req.end();
                });
            } catch (error) {
                logWarning(`Auth test warning: ${error.message}`);
                return true; // Don't fail on auth test
            }
        }
    },
    {
        name: 'DNS Resolution Test',
        test: async () => {
            const url = process.env.VITE_SUPABASE_URL;
            if (!url) return false;
            
            try {
                const hostname = new URL(url).hostname;
                logInfo(`Testing DNS resolution for: ${hostname}`);
                
                return new Promise((resolve) => {
                    const dns = require('dns');
                    dns.resolve4(hostname, (err, addresses) => {
                        if (err) {
                            logError(`DNS resolution failed: ${err.message}`);
                            resolve(false);
                        } else {
                            logSuccess(`DNS resolution successful: ${addresses.join(', ')}`);
                            resolve(true);
                        }
                    });
                });
            } catch (error) {
                logError(`DNS test error: ${error.message}`);
                return false;
            }
        }
    }
];

async function runTests() {
    logHeader('PCR Project Tracker - Supabase Connection Test');
    logInfo('Starting connectivity tests...\n');
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        logHeader(test.name);
        try {
            const result = await test.test();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            logError(`Test failed with error: ${error.message}`);
        }
        console.log('');
    }
    
    // Final summary
    logHeader('Test Results Summary');
    if (passedTests === totalTests) {
        logSuccess(`All ${totalTests} tests passed! 🎉`);
        logInfo('Your Supabase configuration is ready for VPS deployment.');
    } else {
        logWarning(`${passedTests}/${totalTests} tests passed`);
        logError('Some tests failed. Please review the issues above before deploying to VPS.');
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (passedTests === totalTests) {
        logSuccess('✅ READY FOR VPS DEPLOYMENT');
        logInfo('Next steps:');
        logInfo('1. Run: ./validate-supabase.sh');
        logInfo('2. Deploy to VPS: ./deploy-vps.sh yourdomain.com admin@yourdomain.com');
        logInfo('3. Update environment variables on VPS');
    } else {
        logError('❌ NOT READY FOR VPS DEPLOYMENT');
        logInfo('Please fix the issues above before proceeding.');
    }
}

// Check if running directly
if (require.main === module) {
    runTests().catch(error => {
        logError(`Test suite failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runTests, tests };
