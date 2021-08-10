import { tokens, EVM_REVERT } from './helpers'
const Token = artifacts.require('./Token')

require('chai')
	.use(require('chai-as-promised'))
	.should()

contract('Token', ([deployer, reciever, exchange]) => {
	const name = 'El Token'
 	const symbol = 'ELT'
  	const decimals = '18'
  	const totalSupply = tokens(1000000).toString()
	let token 

	//Fetch Token from blockchain	
	beforeEach(async () => {
	    token = await Token.new()
	  })

	describe('deployment', () => {
		it('tracks the name', async () => {
			
		//Read the Token name here...
		const result = await token.name()
		//The token name is "El"
		result.should.equal(name)

		})

		it('tracks the symbol', async () => {
			const result = await token.symbol()
			result.should.equal(symbol)
		})

		it('tracks the decimals', async () => {
			const result = await token.decimals()
			result.toString().should.equal(decimals)
		})

		it('tracks the supply', async () => {
			const result = await token.totalSupply()
			result.toString().should.equal(totalSupply.toString())
		})

		it('assigns the total supply to the deployer', async () => {
			const result = await token.balanceOf(deployer)
			result.toString().should.equal(totalSupply.toString())
		})

	})

	describe('approving tokens', async() => {
		let amount 
		let result

		beforeEach(async () => {
	    	amount = tokens(100)
	    	result = await token.approve(exchange, amount, { from: deployer})
	  	})

		describe('success', () => {
			it('allocates an allowance for delegated token spending on exchange', async() => {
				const allowance = await token.allowance(deployer, exchange)
				allowance.toString().should.equal(amount.toString())
			})

			it('emits an Approval event', async () => {
				const log = result.logs[0]
				log.event.should.eq('Approval')
				const event = log.args
				event.owner.toString().should.equal(deployer, 'owner is correct')
				event.spender.should.equal(exchange, 'spender is correct')
				event.value.toString().should.equal(amount.toString(), 'value is correct')
			})
		})

		describe('failure', () => {
			it('regects invalid spenders', async () => {
				token.approve(0x0, amount, { from: deployer}).should.be.rejected
			})	
		})
	})

	describe('delegating token transfers', () => {
		let result
		let amount

		beforeEach(async () => {
			amount = tokens(100)
			await token.approve(exchange, amount, { from: deployer})
		})
	
	describe('success', async() => {
		beforeEach(async () => {
		result = await token.transferFrom(deployer, reciever, amount, {from: exchange})
	 	})

		it('transfers token balance', async () =>{
			let balanceOf
			//transfer
			balanceOf = await token.balanceOf(deployer)
			balanceOf.toString().should.equal(tokens(999900).toString())
			
			balanceOf = await token.balanceOf(reciever)
			balanceOf.toString().should.equal(tokens(100).toString())
		})

		it('resets allowance', async() => {
			const allowance = await token.allowance(deployer, exchange)
			allowance.toString().should.equal('0')
		})

		it('emits a transfer event', async () => {
			const log = result.logs[0]
			log.event.should.eq('Transfer')
			const event = log.args
			event.from.toString().should.equal(deployer, 'from is correct')
			event.to.should.equal(reciever, 'to is correct')
			event.value.toString().should.equal(amount.toString(), 'value is correct')

		})
	})

	describe('failure', async() => {
	
		it('rejects invaild amount', async () => {
			//attempt transfer of too many tokens
			const invalidAmount = tokens(100000000000)
			await token.transferFrom(deployer, reciever, invalidAmount, { from: exchange }).should.be.rejectedWith(EVM_REVERT)

		})

		it('rejects invaild reciepients', async () => {
			await token.transferFrom(deployer, 0x0, amount, { from: exchange }).should.be.rejected
		})
		
		
		
		// it('rejects insufficient balances', async() => {
		// 	let invalidAmount
			
		// 	invalidAmount = tokens(100000000) //100 Million > than totalSupply
		// 	await token.transfer(reciever, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);

		// 	//Attempt to transfer token when you have none
		// 	invalidAmount = tokens(10) //reciever has no tokens
		// 	await token.transfer(deployer, invalidAmount, { from: reciever }).should.be.rejectedWith(EVM_REVERT);

		// 	})

		// it('rejects invaild recipients', () => {
		// 	token.transfer(0x0, amount, { from: deployer }).should.be.rejected
		// 	})
		})
	})





})