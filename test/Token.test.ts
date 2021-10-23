
contract('Token', (accounts => {

    const truffleAssert = require('truffle-assertions');
    const Token = artifacts.require("Token")
    const Marketplace = artifacts.require("Marketplace")

    let token: any,
        marketplace: any,
        admin = accounts[0],
        user1 = accounts[1],
        user2 = accounts[2],
        tokenName = "CVE Token",
        tokenSymbol = "CVE"

    before(async () => {
        token = await Token.deployed()
        marketplace = await Marketplace.deployed()
        await token.setMarketplace(marketplace.address, { from: admin })
    })

    describe('Deployment', async () => {

        it('Token deploys successfully', async () => {
            const address = token.address
            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('Marketplace deploys successfully', async () => {
            const address = marketplace.address
            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('Token has name', async () => {
            const name = await token.name()
            assert.equal(name, tokenName)
        })

        it('Token has symbol', async () => {
            const symbol = await token.symbol()
            assert.equal(symbol, tokenSymbol)
        })
    })

    describe('Mint', async () => {

        it('Reward wallet address', async () => {

            // Admin is allowed to mint
            let response = await token.reward(user1, 1, { from: admin })
            assert.equal(response.logs[0].event, 'Transfer', 'Transfer event is sent')

            // User is not allowd to mint
            await truffleAssert.reverts(token.reward(user1, 1, { from: user1 }), "NOT_ALLOWED");
        })

        it('Balance after reward', async () => {

            // Check balance of user1 wallet
            let response = await token.balanceOf(user1)
            assert.equal(response, 1, 'Balance after mint is 1 token')

            // Check balance of user2 wallet
            response = await token.balanceOf(user2)
            assert.equal(response, 0, 'Balance after mint is 0 token')
        })

        it('Total supply', async () => {

            // Check balance of user wallet
            let response = await token.totalSupply()
            assert.equal(response, 1, 'Total supply after mint is 1 token')
        })

        it('Max supply', async () => {

            // Mint more than max supply should fail
            await truffleAssert.reverts(token.reward(user1, '1000000000000000000000000', { from: admin }), "MAX_SUPPLY_REACHED");
        })
    })

    describe('Transfer', async () => {

        it('Balance before transfer', async () => {

            // Check balance of user1 wallet
            let response = await token.balanceOf(user1)
            assert.equal(response, 1, 'Balance after mint is 1 token')

            // Check balance of user2 wallet
            response = await token.balanceOf(user2)
            assert.equal(response, 0, 'Balance after mint is 0 token')
        })

        it('Transfer token', async () => {

            // Admin can not transfer user1 funds
            await truffleAssert.reverts(token.transferFrom(user1, admin, 1, { from: admin }))

            // User2 can not transfer user1 funds
            await truffleAssert.reverts(token.transferFrom(user1, user2, 1, { from: user2 }))

            // Transfer 1 token from user1 to user2
            let response = await token.transferFrom(user1, user2, 1, { from: user1 })
            assert.equal(response.logs[0].event, 'Transfer', 'Transfer event is sent')

        })

        it('Balance after transfer', async () => {

            // Check balance of user1 wallet
            let response = await token.balanceOf(user1)
            assert.equal(response, 0, 'Balance after mint is 0 token')

            // Check balance of user2 wallet
            response = await token.balanceOf(user2)
            assert.equal(response, 1, 'Balance after mint is 1 token')
        })
    })

    describe('Admin', async () => {

        it('setAdmin', async () => {

            // Check that admin is admin
            let _admin = await token.admin.call()
            assert.equal(_admin, admin, 'Admin should be same')

            // Set new admin
            await token.setAdmin(user1, { from: admin })

            // Check that admin is updated
            _admin = await token.admin.call()
            assert.equal(_admin, user1, 'Admin should have updated')

            // Restore admin
            await token.setAdmin(admin, { from: user1 })

            // Check that admin is admin
            _admin = await token.admin.call()
            assert.equal(_admin, admin, 'Admin should be same')

            // Only admin can update admin
            await truffleAssert.reverts(token.setAdmin(user1, { from: user1 }), "ONLY_ADMIN");
        })
    })
}))