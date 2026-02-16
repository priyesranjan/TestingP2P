#!/usr/bin/env node

const WebSocket = require('ws');
const axios = require('axios');

const BASE_URL = 'https://anon-chat-20.preview.emergentagent.com';
const WS_URL = `wss://anon-chat-20.preview.emergentagent.com/api/ws`;

class BackendTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    async test(name, testFn) {
        this.log(`🔍 Testing: ${name}`);
        try {
            await testFn();
            this.testResults.passed++;
            this.testResults.tests.push({ name, status: 'PASS' });
            this.log(`✅ PASS: ${name}`);
            return true;
        } catch (error) {
            this.testResults.failed++;
            this.testResults.tests.push({ name, status: 'FAIL', error: error.message });
            this.log(`❌ FAIL: ${name} - ${error.message}`);
            return false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testAPIEndpoints() {
        await this.test('Health Endpoint', async () => {
            const response = await axios.get(`${BASE_URL}/api/health`);
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (response.data.status !== 'ok') throw new Error('Health check failed');
        });

        await this.test('Online Users Endpoint', async () => {
            const response = await axios.get(`${BASE_URL}/api/online`);
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!Array.isArray(response.data.users)) throw new Error('Users should be array');
            if (typeof response.data.count !== 'number') throw new Error('Count should be number');
        });

        await this.test('API Info Endpoint', async () => {
            const response = await axios.get(`${BASE_URL}/api`);
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (response.data.name !== 'Ghost Protocol API') throw new Error('API name mismatch');
            if (!response.data.endpoints.websocket) throw new Error('WebSocket endpoint info missing');
        });
    }

    async testWebSocketConnection() {
        await this.test('WebSocket Connection & UUID Assignment', async () => {
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(WS_URL);
                let userId = null;
                
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }, 10000);

                ws.on('open', () => {
                    this.log('WebSocket connected');
                });

                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            userId = message.userId;
                            if (!userId) throw new Error('No userId in connected message');
                            if (typeof userId !== 'string') throw new Error('UserId should be string');
                            clearTimeout(timeout);
                            ws.close();
                            resolve();
                        } else if (message.type === 'online_users') {
                            // Expected after connection
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws.close();
                        reject(error);
                    }
                });

                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                ws.on('close', () => {
                    if (!userId) {
                        clearTimeout(timeout);
                        reject(new Error('Connection closed without receiving userId'));
                    }
                });
            });
        });
    }

    async testOnlineUsersBroadcast() {
        await this.test('Online Users Broadcast', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let user1GotBroadcast = false;
                let user2GotBroadcast = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('Test timeout'));
                }, 15000);

                const checkComplete = () => {
                    if (user1GotBroadcast && user2GotBroadcast && user1Id && user2Id) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        resolve();
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                        } else if (message.type === 'online_users') {
                            if (message.users.length >= 2) {
                                user1GotBroadcast = true;
                                checkComplete();
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                        } else if (message.type === 'online_users') {
                            if (message.users.length >= 2) {
                                user2GotBroadcast = true;
                                checkComplete();
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async testRandomMatching() {
        await this.test('Random Matching', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let user1Connected = false;
                let user2Connected = false;
                let user1Matched = false;
                let user2Matched = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('Random matching timeout'));
                }, 20000);

                const tryMatch = () => {
                    if (user1Connected && user2Connected && !user1Matched && !user2Matched) {
                        ws1.send(JSON.stringify({ type: 'find_random' }));
                        setTimeout(() => {
                            ws2.send(JSON.stringify({ type: 'find_random' }));
                        }, 100);
                    }
                };

                const checkComplete = () => {
                    if (user1Matched && user2Matched) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        resolve();
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                            user1Connected = true;
                            tryMatch();
                        } else if (message.type === 'match_found') {
                            user1Matched = true;
                            if (message.partnerId !== user2Id && user2Id) {
                                throw new Error('Partner ID mismatch');
                            }
                            checkComplete();
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                            user2Connected = true;
                            tryMatch();
                        } else if (message.type === 'match_found') {
                            user2Matched = true;
                            if (message.partnerId !== user1Id && user1Id) {
                                throw new Error('Partner ID mismatch');
                            }
                            checkComplete();
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async testDirectConnect() {
        await this.test('Direct Connect to User', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let user1Connected = false;
                let user2Connected = false;
                let matchFound = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('Direct connect timeout'));
                }, 15000);

                const tryDirectConnect = () => {
                    if (user1Connected && user2Connected && user1Id && user2Id) {
                        ws1.send(JSON.stringify({ 
                            type: 'connect_user', 
                            targetUserId: user2Id 
                        }));
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                            user1Connected = true;
                            tryDirectConnect();
                        } else if (message.type === 'match_found') {
                            if (message.partnerId === user2Id) {
                                matchFound = true;
                                clearTimeout(timeout);
                                ws1.close();
                                ws2.close();
                                resolve();
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                            user2Connected = true;
                            tryDirectConnect();
                        } else if (message.type === 'match_found') {
                            if (message.partnerId === user1Id) {
                                // User 2 also got matched
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async testChatMessaging() {
        await this.test('Real-time Chat Messaging', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let matched = false;
                let messageReceived = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('Chat messaging timeout'));
                }, 20000);

                const sendTestMessage = () => {
                    if (matched) {
                        ws1.send(JSON.stringify({ 
                            type: 'chat_message', 
                            text: 'Hello from user 1!' 
                        }));
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                            if (user2Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'match_found') {
                            matched = true;
                            setTimeout(sendTestMessage, 500);
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                            if (user1Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'chat_message') {
                            if (message.text === 'Hello from user 1!' && message.senderId === user1Id) {
                                messageReceived = true;
                                clearTimeout(timeout);
                                ws1.close();
                                ws2.close();
                                resolve();
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async testWebRTCSignaling() {
        await this.test('WebRTC Signaling', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let matched = false;
                let signalReceived = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('WebRTC signaling timeout'));
                }, 15000);

                const sendWebRTCSignal = () => {
                    if (matched) {
                        ws1.send(JSON.stringify({ 
                            type: 'webrtc_signal', 
                            signal: { 
                                type: 'offer', 
                                sdp: 'fake-sdp-data' 
                            } 
                        }));
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                            if (user2Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'match_found') {
                            matched = true;
                            setTimeout(sendWebRTCSignal, 500);
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                            if (user1Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'webrtc_signal') {
                            if (message.signal.type === 'offer' && 
                                message.signal.sdp === 'fake-sdp-data' && 
                                message.senderId === user1Id) {
                                signalReceived = true;
                                clearTimeout(timeout);
                                ws1.close();
                                ws2.close();
                                resolve();
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async testDisconnectFlow() {
        await this.test('Disconnect Chat Flow', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let matched = false;
                let partnerDisconnected = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('Disconnect flow timeout'));
                }, 15000);

                const disconnectChat = () => {
                    if (matched) {
                        ws1.send(JSON.stringify({ type: 'disconnect_chat' }));
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                            if (user2Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'match_found') {
                            matched = true;
                            setTimeout(disconnectChat, 500);
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                            if (user1Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'partner_disconnected') {
                            partnerDisconnected = true;
                            clearTimeout(timeout);
                            ws1.close();
                            ws2.close();
                            resolve();
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async testRateLimiting() {
        await this.test('Message Rate Limiting', async () => {
            return new Promise((resolve, reject) => {
                const ws1 = new WebSocket(WS_URL);
                const ws2 = new WebSocket(WS_URL);
                let user1Id = null;
                let user2Id = null;
                let matched = false;
                let rateLimitError = false;

                const timeout = setTimeout(() => {
                    ws1.close();
                    ws2.close();
                    reject(new Error('Rate limiting test timeout'));
                }, 15000);

                const spamMessages = () => {
                    if (matched) {
                        // Send multiple messages quickly to trigger rate limiting
                        for (let i = 0; i < 5; i++) {
                            ws1.send(JSON.stringify({ 
                                type: 'chat_message', 
                                text: `Spam message ${i}` 
                            }));
                        }
                    }
                };

                ws1.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user1Id = message.userId;
                            if (user2Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        } else if (message.type === 'match_found') {
                            matched = true;
                            setTimeout(spamMessages, 500);
                        } else if (message.type === 'error') {
                            if (message.message.includes('too quickly')) {
                                rateLimitError = true;
                                clearTimeout(timeout);
                                ws1.close();
                                ws2.close();
                                resolve();
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws2.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'connected') {
                            user2Id = message.userId;
                            if (user1Id) {
                                ws1.send(JSON.stringify({ type: 'connect_user', targetUserId: user2Id }));
                            }
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws1.close();
                        ws2.close();
                        reject(error);
                    }
                });

                ws1.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });

                ws2.on('error', (error) => {
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    reject(error);
                });
            });
        });
    }

    async runAllTests() {
        this.log('🚀 Starting Ghost Protocol Backend Tests');
        this.log('='.repeat(50));

        await this.testAPIEndpoints();
        await this.testWebSocketConnection();
        await this.testOnlineUsersBroadcast();
        await this.testRandomMatching();
        await this.testDirectConnect();
        await this.testChatMessaging();
        await this.testWebRTCSignaling();
        await this.testDisconnectFlow();
        await this.testRateLimiting();

        this.log('='.repeat(50));
        this.log(`📊 Test Results: ${this.testResults.passed} passed, ${this.testResults.failed} failed`);
        
        if (this.testResults.failed > 0) {
            this.log('\n❌ Failed Tests:');
            this.testResults.tests
                .filter(test => test.status === 'FAIL')
                .forEach(test => {
                    this.log(`  - ${test.name}: ${test.error}`);
                });
        }

        const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100;
        this.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);

        return this.testResults;
    }
}

async function main() {
    const tester = new BackendTester();
    const results = await tester.runAllTests();
    
    // Exit with error code if tests failed
    process.exit(results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BackendTester;