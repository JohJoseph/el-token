import {tokens, ether, EVM_REVERT, ETHER_ADDRESS} from './helpers'
const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

require('chai')
	.use(require('chai-as-promised'))
	.should()

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
    let token
	let exchange
    const feePercent = 10

	beforeEach(async () => {
        //Deploy Tokens
        token = await Token.new()
        //Transfer 100 tokens to user1
        token.transfer(user1, tokens(100), { from: deployer})
        //Deploy Exchange
        exchange = await Exchange.new(feeAccount, feePercent)  
    })

	describe('deployment', () => {
		it('tracks the feeAccount', async () => {
            //Tracks the feeAccount
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it('tracks the feePercent', async () => {
            //Tracks the feeAccount
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
	})

    describe('fallback', () => {
        it('reverts when ETH is sent', async () => {
            await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('depositing Ether', async () => {
        let result
        let amount

        beforeEach(async () => {
            amount = ether(1)
            result = await exchange.depositEther({ from: user1 , value: amount})
        })

        it('tracks the Ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1)
            balance.toString().should.equal(amount.toString())
        })

        it('emits a deposit event', async () => {
            const log = result.logs[0]
            log.event.should.eq('Deposit')
            const event = log.args
            event.token.should.equal(ETHER_ADDRESS, 'token address is correct')
            event.user.toString().should.equal(user1, 'user is correct')
            event.amount.toString().should.equal(amount.toString(), 'amount is correct')
            event.balance.toString().should.equal(amount.toString(), 'balance is correct')

        })
    })

    describe('withdrawing Ether', async () => {
        let result
        let amount

        beforeEach(async () => {
            amount = ether(1)
            // Deposit Ether first
            await exchange.depositEther({ from: user1, value: amount})
        })

        describe('success', async () => {
            beforeEach(async () => {
            //withdraw Ether
            result = await exchange.withdrawEther(amount, { from: user1 })
            })
    
            it('withdraws Ether funds', async () => {
                const balance = await exchange.tokens(ETHER_ADDRESS, user1)
                balance.toString().should.equal('0')
            })

            it('emits a withdraw event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Withdraw')
                const event = log.args
                event.token.should.equal(ETHER_ADDRESS, 'token address is correct')
                event.user.should.equal(user1, 'user is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal('0', 'balance is correct')
    
            })
        })

        describe('failure', () => {
            it('rejects withdraws for insufficient balances', async () => {
                await exchange.withdrawEther(ether(100), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    
    })

    describe('depositing tokens', () => {
        let result
        let amount

        describe('success', () => {
            
            beforeEach(async () => {
                amount = tokens(10)
                await token.approve(exchange.address, amount, { from: user1 })
                result = await exchange.depositToken(token.address, amount, { from: user1 })
            })

		    it('tracks the token deposit', async () => {
                //check exchange token balance
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                //check tokens on exchange
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())

            })

            it('emits a deposit event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Deposit')
                const event = log.args
                event.token.should.equal(token.address, 'token address is correct')
                event.user.toString().should.equal(user1, 'user is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal(amount.toString(), 'balance is correct')
    
            })
        })

        describe('failure', () => {
            
            it('rejects ETHER deposit', async () => {
                //0x0000000000000000000000000000000000000000 42char ETH address
                await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)

            })

		    it('fails when no tokens are approved ', async () => {
                //Don't approve any tokens with out depositing
                await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('withdrawing tokens', async () => {
        let result
        let amount

        beforeEach(async () => {
            amount = tokens(10)
            // Deposit Token first
            await token.approve(exchange.address, amount, { from: user1 })
            await exchange.depositToken(token.address, amount,{ from: user1 })
            //Withdraw Token
            result = await exchange.withdrawToken(token.address, amount, { from: user1 })
        })

        describe('success', async () => {
               
            it('withdraws Token funds', async () => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal('0')
            })

            it('emits a withdraw event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Withdraw')
                const event = log.args
                event.token.should.equal(token.address, 'token address is correct')
                event.user.should.equal(user1, 'user is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal('0', 'balance is correct')
    
            })
        })

        describe('failure', () => {
                        
            it('rejects ETHER withdraw', async () => {
                await exchange.withdrawToken(ETHER_ADDRESS, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })

            it('fails for insufficient balances', async () => {
                await exchange.withdrawToken(token.address, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('checking balances', async () => {
        
        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: ether(1) })
        })
        
        it('returns user balance', async () => {
            const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
            result.toString().should.equal(ether(1).toString())
        })
    })

    describe('making orders', async () => {
        let result
    
        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })

        it('tracks the newly created order', async () => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
            //fetch order out of mapping
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1, 'user1 is correct')
            order.tokenGet.should.equal(token.address, 'tokenGet is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
        
        it('emits a order event', async () => {
            const log = result.logs[0]
            log.event.should.eq('Order')
            const event = log.args
            event.id.toString().should.equal('1', 'id is correct')
            event.user.should.equal(user1, 'user1 is correct')
            event.tokenGet.should.equal(token.address, 'tokenGet is correct')
            event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
    })
        
    describe('order actions', async () => {
	    
        beforeEach(async () => {
            //user1 deposits Ether only
            await exchange.depositEther({ from: user1, value: ether(1) })
            //give tokens to user2
            await token.transfer(user2, tokens(100), { from: deployer })
            //user2 deposits tokens only
            await token.approve(exchange.address, tokens(2), { from: user2 })
            await exchange.depositToken(token.address, tokens(2), { from: user2})
            //user1 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
	    })
        
        describe('filling orders', async () => {
            let result
            
            describe('success', async () => {
                beforeEach(async () => {
                    //user2 fills order
                    result = await exchange.fillOrder('1', { from: user2 })
                })
                
                it('excecutes the trade & charges fees', async () => {
	
                    let balance 
                    
                    balance = await exchange.balanceOf(token.address, user1)
                    balance.toString().should.equal(tokens(1).toString(), 'user1 recieved tokens')
                    
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    balance.toString().should.equal(ether(1).toString(), 'user2 recieved tokens')
                
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    balance.toString().should.equal('0', 'user2 ether deducted')
                
                    balance = await exchange.balanceOf(token.address, user2)
                    balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
                
                    const feeAccount = await exchange.feeAccount()
                
                    balance = await exchange.balanceOf(token.address, feeAccount)
                    balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount recieved fee')
                })
                    
                it('updates filled orders', async () => {
                    const orderFilled = await exchange.orderFilled(1)
                
                    orderFilled.should.equal(true) 
                })
                
                it('emits a Trade event', async () => {
                        const log = result.logs[0]
                        log.event.should.eq('Trade')
                        const event = log.args
                        event.id.toString().should.equal('1', 'id is correct')
                        event.user.should.equal(user1, 'user1 is correct')
                        event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                        event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                        event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                        event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                        event.userFill.should.equal(user2, 'user2 is correct')
                        event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })
        
            describe('failure', async () => {
            
                it('rejects already-filled orders', async () => {
	
                    //Fill the order
                    await exchange.fillOrder('1', { from: user2 }).should.be.fulfilled
                
                    //Try to fill it again
                    await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                    
                })
            
                it('rejects cancelled orders', async () => {
                
                    //Cancel the order
                    await exchange.cancelOrder ('1', { from: user1 }).should.be.fulfilled
                
                    //Try to fill the order
                    await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                
                })
            })
        })
          
    describe('cancelling orders', async () => {
	        let result
	    
            describe('success', async () => {
	            beforeEach(async () => {
	                result = await exchange.cancelOrder('1', { from: user1 })
	            })
	        
                it('updates cancelled orders', async () => {
                    const orderCancelled = await exchange.orderCancelled(1)
                    orderCancelled.should.equal(true)
                 })

                it('emits a Cancel event', async () => {
                    const log = result.logs[0]
                    log.event.should.eq('Cancel')
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user1 is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })
        
            describe('failure', async () => {
	
                it('rejects invailid order IDs', async () => {
                    const invalidOrderId = 99999
                    await exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
                })
            
                it('rejects unauthorized cancelations', async () => {
                    //Try to cancel the order from another user
                    await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
            })
        })
    }) 
})