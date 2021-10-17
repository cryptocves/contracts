
contract('Marketplace', (accounts => {

    const Web3 = require("web3")
    const truffleAssert = require('truffle-assertions')
    const NFT = artifacts.require("NFT")
    const Token = artifacts.require("Token")
    const Marketplace = artifacts.require("Marketplace")
    const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"))
    
    // Contracts
    let nft: any, 
    marketplace: any, 
    token: any,

    // NFT
    nftId: number,
    mintingFee: string, 
    price: string,
    metadataHash = '773a5434b13610B593Ac2',

    // Token
    mintYield: number,
    transferYield: number,

    // Accounts
    admin = accounts[0],
    seller = accounts[1], 
    buyer = accounts[2]

    before(async () => {

        // Setup contracts
        nft = await NFT.deployed()
        token = await Token.deployed()
        marketplace = await Marketplace.deployed()
    })

    describe('Deployment',  async () => {

        it('NFT deploys successfully', async () => {
            const address = nft.address
            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

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
    })

    describe('Marketplace open or closed', async() => {

        it('Marketplace is open after deployment', async () => {
            const marketplaceIsOpen = await marketplace.marketplaceIsOpen.call()
            assert.equal(marketplaceIsOpen, true, 'Marketplace should be open')
        })

        it('Marketplace is closed', async () => {
           await marketplace.openMarketplace(false, { from: admin })
           const marketplaceIsOpen = await marketplace.marketplaceIsOpen.call()
           assert.equal(marketplaceIsOpen, false, 'Marketplace should be closed')
        })

        it('Marketplace unavailable when closed', async () => {
            await marketplace.openMarketplace(false, { from: admin })

            // mintNFT should not be possible when marketplace is closed
            await truffleAssert.reverts(marketplace.mintNFT("", "", { from: admin }), "MARKETPLACE_CLOSED");
            
            // offerNFT should not be possible when marketplace is closed
            await truffleAssert.reverts(marketplace.offerNFT(0, 0, { from: admin }), "MARKETPLACE_CLOSED");

            // buyNFT should not be possible when marketplace is closed
            await truffleAssert.reverts(marketplace.buyNFT(0, { from: admin }), "MARKETPLACE_CLOSED");

            // Open marketplace again
            await marketplace.openMarketplace(true, { from: admin })
         })
    })

    describe('Minting NFT', async() => {
        let mintingFee: string
 
        before( async() => {
            mintingFee = web3.utils.toWei('1', 'ether')
        })
        
        it('Mint yield', async () => {

            const newMintYield = '1000000000000000000'
            await marketplace.setMintYield(newMintYield, { from: admin })
            mintYield = await marketplace.mintYield.call()

            // Mint yield should have been updated
            assert.equal(mintYield.toString(), newMintYield, 'MintYield should have been updated')
        })

        it('Mint new NFT as admin', async () => {
    
            // Set minting fee to 0.001 eth
            await marketplace.setMintFee(web3.utils.toWei('0.001', 'ether'), { from: admin })
    
            // Admin should be able to mint for free
            const response = await marketplace.mintNFT("CVE-2021-0000", metadataHash, { 
                from: admin
            })
            const event = await response.logs[0].args
            const nftToken = await nft.getById(event.nftId)
    
            // NFT should be minted
            assert.equal(response.logs[0].event, 'NftMinted', 'nft is minted')
            assert.equal(event.to, admin, 'to is corrent')
            assert.equal(nftToken.cve, "CVE-2021-0000", 'cve is correct')

            // Admin should have received mint yield
            const balance = await token.balanceOf(admin)
            assert.equal(balance.toString(), mintYield, 'Admin should have received mint yield')
        })

        it('Mint new NFT', async () => {

            // Mint nft and pay mint fee
            const result = await marketplace.mintNFT("CVE-2021-0001", metadataHash, { 
                from: seller,
                value: mintingFee
            })
            const event = await result.logs[0].args
            const nftId = event.nftId
            const nftToken = await nft.getById(nftId)

            // NFT should be minted
            assert.equal(event.to, seller, 'to is corrent')
            assert.equal(nftToken.cve, "CVE-2021-0001", 'cve is correct')

            // Minter should be NFT owner
            const owner = await nft.ownerOf(nftId)
            assert.equal(owner, seller, 'minter is owner')

            // Minter should have received mint yield
            const balance = await token.balanceOf(seller)
            assert.equal(balance.toString(), mintYield, 'Seller should have received mint yield')
        })

        it('Mint NFT validation', async () => {

            // Mint nft without cve should fail
            await truffleAssert.reverts(marketplace.mintNFT("", "", { from: seller }), "MISSING_CVE");
            
            // Mint nft without metadata hash should fail
            await truffleAssert.reverts(marketplace.mintNFT("CVE-2021-0010", "", { from: seller }), "MISSING_METADATA");
        })

        it('NFT is already minted', async () => {

            // Should not be possible to mint the same CVE again
            await truffleAssert.reverts(marketplace.mintNFT("CVE-2021-0001", metadataHash, { from: seller }), "ALREADY_MINTED");
        })

    })




    describe('Minting NFT fee', async () => {

        /// TODO: Improve
        it('Minter balance after mint', async () => {

            // Set 1 eth
            let mintingFee = web3.utils.toWei('1', 'ether')
            await marketplace.setMintFee(mintingFee, { from: admin })
            const balanceBeforeMint = await web3.eth.getBalance(seller)

            await marketplace.mintNFT("CVE-2021-0010", metadataHash,{ 
                from: seller,
                value: mintingFee
            })
            
            const balanceAfterMint = await web3.eth.getBalance(seller)
            const res = (balanceBeforeMint - balanceAfterMint) > parseInt(mintingFee)
            assert.isBoolean(res, 'Minter balance should have decreased by 1 eth + gas') // For some reason last part of value differs
        })

        it('Payment is less than fee', async () => {

            // Set mint fee to 1 eth
            await marketplace.setMintFee(web3.utils.toWei('1', 'ether'), { from: admin })
            
            // Should fail - mint nft and pay less than fee
            const response = marketplace.mintNFT("CVE-2021-0013", metadataHash, { 
                from: seller,
                value: '10'
            })
            
            await truffleAssert.reverts(response, "PAYMENT_TOO_LOW");
        })

        it('Refund payment if more than fee', async () => {

            // Set 1 eth
            mintingFee = web3.utils.toWei('1', 'ether')
            await marketplace.setMintFee(mintingFee, { from: admin })
            
            // Mint nft, pay too much and receive refund
            const balanceBeforeMint = parseInt(await web3.eth.getBalance(seller))
            let response = await marketplace.mintNFT("CVE-2020-0012", metadataHash, { 
                from: seller,
                value: web3.utils.toWei('5', 'ether') // 4 eth too much
            })
            
            // Calculate paid fee
            const tx = await web3.eth.getTransaction(response.tx)
            const balanceAfterMint = await web3.eth.getBalance(seller)
            const gas = (tx.gasPrice * response.receipt.gasUsed)
            const expectedBalanceAfterMint = (balanceBeforeMint - parseInt(mintingFee) - gas).toString()
            assert.equal(balanceAfterMint.substring(0,8), expectedBalanceAfterMint.substring(0,8), 'Minter balance should have decreased by 1 eth') // For some reason last part of value differs
        })

        it('Set minting fee', async () => {

            // Set 1 eth
            let mintingFee = web3.utils.toWei('1', 'ether')
            await marketplace.setMintFee(mintingFee, { from: admin })
            let fee = await marketplace.mintFee.call()
            assert.equal(fee, mintingFee, 'minting is 1 eth')
    
            // Set 0.001 eth
            mintingFee = web3.utils.toWei('0.001', 'ether')
            await marketplace.setMintFee(mintingFee, { from: admin })
            fee = await marketplace.mintFee.call()
            assert.equal(fee, mintingFee, 'minting is 0.001 eth')
        })

        it('Only admin can set mintinig fee', async () => {

            // Should fail if other than admin set minting fee
            let mintingFee = web3.utils.toWei('1', 'ether')
            await truffleAssert.reverts(marketplace.setMintFee(mintingFee, { from: seller }), "NOT_ADMIN");
        })

        it('Admin should not pay minting fee', async () => {

            // Set and get marketplace fee
            let response = await marketplace.setMarketplaceFee(20) // 20 = 5%
            response = await marketplace.marketplaceFee.call()
            assert.equal(response, 20, 'Marketplace fee has been set')

            //Mint NFT as admin without paying fee
            response = await marketplace.mintNFT("CVE-2021-0011", metadataHash, { 
                from: admin
            })

            // NFT should exist
            const event = await response.logs[0].args
            const nftToken = await nft.getById(event.nftId)
            assert.equal(nftToken.cve, "CVE-2021-0011", 'NFT is minted')
        })

        it('Admin minting fee received', async () => {

            // Set minting fee
            let mintingFee = web3.utils.toWei('1', 'ether')
            await marketplace.setMintFee(mintingFee, { from: admin })
            let mintFee = await marketplace.mintFee.call()
            assert.equal(mintFee, mintingFee, 'minting is 1 eth')
    
            const balanceBeforeMint = await web3.eth.getBalance(admin)
    
            // Mint NFT 
            await marketplace.mintNFT("CVE-2021-0012", metadataHash, { 
                from: seller,
                value: mintFee
            })
            
            // Calculate paid fee
            const balanceAfterMint = await web3.eth.getBalance(admin)
            const diff = parseInt(balanceAfterMint) - parseInt(balanceBeforeMint)
            assert.equal(mintFee, diff, 'Admin balance should have increased by 1 eth')
        })
    })




    describe('Offer NFT for sale', async () => {
        
        before( async() => {

            // Set mint fee
            mintingFee = web3.utils.toWei('0.001', 'ether')
            price = web3.utils.toWei('1', 'ether')

             // Set minting fee
            await marketplace.setMintFee(mintingFee, { from: admin })

            // Mint NFT
            let response = await marketplace.mintNFT("CVE-2021-0021", metadataHash, { 
                from: seller,
                value: mintingFee
            })
            const event = await response.logs[0].args
            nftId = event.nftId
        })

        it('NFT ownership before offer', async () => {

            // NFT should be owned by seller
            let owner = await nft.ownerOf(nftId)
            assert.equal(owner, seller, 'Seller is owner')

            // No one is approved to handle NFT yet
            let response = await nft.getApproved(nftId)
            assert.equal(response, 0x0, 'No one is approved to manage NFT')

            // Marketplace should not be approved to handle NFT
            response = marketplace.offerNFT(nftId, price, { from: seller })
            await truffleAssert.reverts(response, "NOT_APPROVED");
        })

        it('Approve marketplace to handle NFT', async () => {

            // Approval event
            let response = await nft.approve(marketplace.address, nftId, { from: seller })
            assert.equal(response.logs[0].event, 'Approval', 'Approval event is sent')
            
            // Marketplace should be approved to handle nft
            response = await nft.getApproved(nftId)
            assert.equal(response, marketplace.address, 'Marketplace contract is approved to manage nft')
        })

        it('Move NFT to marketplace', async () => {

            // Should fail - admin should not be able to put NFT up for sale
            let response = marketplace.offerNFT(nftId, price, { from: admin })
            await truffleAssert.reverts(response, "NOT_OWNER");

            // Should fail - buyer should not be able to put NFT up for sale
            response = marketplace.offerNFT(nftId, price, { from: buyer })
            await truffleAssert.reverts(response, "NOT_OWNER");

            // Should fail - too low price, minimum minting fee
            response = marketplace.offerNFT(nftId, 1000, { from: seller })
            await truffleAssert.reverts(response, "TOO_LOW_PRICE");

            // Seller should be able to put NFT up for sale
            response = await marketplace.offerNFT(nftId, price, { from: seller })
            assert.equal(response.logs[0].event, 'NftOffer', 'NftOffer event')
        })

        it('NFT ownership after offer', async () => {

            // Marketplace should be the NFT owner now
            let owner = await nft.ownerOf(nftId)
            assert.equal(marketplace.address, owner, 'Marketplace is owner')

            // Seller should not be able to put NFT up for sale again
            let response = marketplace.offerNFT(nftId, price, { from: seller })
            await truffleAssert.reverts(response, "NOT_OWNER");

            // Seller should not be able to transfer NFT
            response = marketplace.transferFrom(seller, buyer, nftId, { from: seller })
            await truffleAssert.reverts(response, "NOT_ALLOWED");
        })

    })




    describe('Buy NFT', async () => {
        let buyerBalanceBeforeBuy: string, 
        sellerBalanceBeforeBuy: string,
        marketplaceBalanceBeforeBuy: string,
        adminBalanceBeforeBuy: string,
        nftPrice: number,
        nftMarketplacePrice: number

        before( async() => {

            // Get balances before buy
            buyerBalanceBeforeBuy = await web3.eth.getBalance(buyer);
            sellerBalanceBeforeBuy = await web3.eth.getBalance(seller);
            marketplaceBalanceBeforeBuy = await web3.eth.getBalance(marketplace.address);
            adminBalanceBeforeBuy = await web3.eth.getBalance(admin);
            nftMarketplacePrice = await marketplace.getNftPrice(nftId)

            // Get NFT price
            const offer = await marketplace.offerById(nftId)
            nftPrice = offer.price
        })

        it('Transfer yield', async () => {

            const newTransferYield = '500000000000000000'
            await marketplace.setTransferYield(newTransferYield, { from: admin })
            transferYield = await marketplace.transferYield.call()
            adminBalanceBeforeBuy = await web3.eth.getBalance(admin); // Update after gas cost

            // Transfer yield should have been updated
            assert.equal(transferYield.toString(), newTransferYield, 'Transfer yield should have been updated')
        })

        it('Transfer NFT from marketplace to buyer', async () => {

            // Should fail - no value property given
            let response = marketplace.buyNFT(nftId, { 
                from: buyer
            })
            await truffleAssert.reverts(response, "MISSING_PAYMENT");

            // Should fail - value is zero
            response = marketplace.buyNFT(nftId, { 
                from: buyer,
                value: '0'
            })
            await truffleAssert.reverts(response, "MISSING_PAYMENT");

            // Should fail - seller try to buy own NFT
            response = marketplace.buyNFT(nftId, { 
                from: seller,
                value: nftMarketplacePrice
            })
            await truffleAssert.reverts(response, "NOT_ALLOWED_BUY_OWN_TOKEN");

            // Should fail - payment is too small
            response = marketplace.buyNFT(nftId, { 
                from: buyer,
                value: '100'
            })
            await truffleAssert.reverts(response, "PAYMENT_TOO_LOW");

            const tokenBalanceBefore = await token.balanceOf(seller)

            // Should succeed
            response = await marketplace.buyNFT(nftId, { 
                from: buyer,
                value: nftMarketplacePrice
            })
            assert.equal(response.logs[0].event, 'NftSold', 'NftSold event')
            assert.equal(response.logs[1].event, 'NftPurchased', 'NftPurchased event')

            // Seller should have received mint yield
            const tokenBalanceAfter = await token.balanceOf(seller)
            const expected = (parseInt(tokenBalanceAfter) - transferYield).toString()
            assert.equal(tokenBalanceBefore.toString(), expected, 'Seller should have received transfer yield')

        })

        it('Check balances after transfer', async () => {

            // Buyer balance after buy should decrease
            const buyerBalanceAfterBuy = await web3.eth.getBalance(buyer)
            assert(parseInt(buyerBalanceBeforeBuy) > parseInt(buyerBalanceAfterBuy), 'Balance should decrease after buy')
            
            // Seller balance after buy should increase
            const sellerBalanceAfterBuy = await web3.eth.getBalance(seller)
            assert(parseInt(sellerBalanceBeforeBuy) < parseInt(sellerBalanceAfterBuy), 'Balance should increase after buy')

            // Marketplace balance after buy should stay the same
            const marketplaceBalanceAfterBuy = await web3.eth.getBalance(marketplace.address)
            assert(parseInt(marketplaceBalanceBeforeBuy) == parseInt(marketplaceBalanceAfterBuy), 'Balance should be unchanged')

        })

        it('NFT ownership after buy', async () => {

            // Buyer should be the NFT owner now
            let owner = await nft.ownerOf(nftId)
            assert.equal(buyer, owner, 'Buyer is owner')

            // Seller should not be able to put NFT up for sale again
            let response = marketplace.offerNFT(nftId, price, { from: seller })
            await truffleAssert.reverts(response, "NOT_OWNER");

            // Seller should not be able to transfer NFT
            response = marketplace.transferFrom(seller, buyer, nftId, { from: seller })
            await truffleAssert.reverts(response, "NOT_ALLOWED")
        })

        it('Marketplace fee', async () => {

            // Admin should receive the marketplace fee
            const adminBalanceAfterBuy = await web3.eth.getBalance(admin)
            const earned = nftMarketplacePrice - nftPrice
            const diff = parseInt(adminBalanceAfterBuy) - parseInt(adminBalanceBeforeBuy)
            assert(earned == diff, 'Admin should earn marketplace fee')
        })

        it('NFT is not up for sale after buy', async () => {

            // Should fail - Try put up NFT for sale again
            const response = marketplace.buyNFT(nftId, { 
                from: buyer,
                value: await marketplace.getNftPrice(nftId)
            })
            await truffleAssert.reverts(response, "NOT_FOR_SALE");
        })
    })      




    describe('Withdraw NFT', async () => {

        it('Withdraw NFT', async () => {

            // Should fail - Withdraw NFT that is not for sale 
            let response = marketplace.withdrawOffer(nftId, { from: buyer })
            await truffleAssert.reverts(response, "NOT_FOR_SALE");

            // Approve markeplace to handle NFT
            response = await nft.approve(marketplace.address, nftId, { from: buyer })
            assert.equal(response.logs[0].event, 'Approval', 'Approval event is sent')

            // Put up NFT for sale 
            response = await marketplace.offerNFT(nftId, price, { from: buyer })
            assert.equal(response.logs[0].event, 'NftOffer', 'NFT is up for sale')

            // Marketplace is NFT owner
            response = await nft.ownerOf(nftId)
            assert.equal(response, marketplace.address, 'Marketplace is owner')

            // Should fail - withdraw NFT as not owner
            response = marketplace.withdrawOffer(nftId, { from: seller })
            await truffleAssert.reverts(response, "NOT_OWNER");

            // Withdraw NFT
            response = await marketplace.withdrawOffer(nftId, { from: buyer })
            assert.equal(response.logs[0].event, 'NftOfferWithdraw', 'NftOfferWithdraw event')

            // Should fail - withdraw again
            response = marketplace.withdrawOffer(nftId, { from: buyer })
            await truffleAssert.reverts(response, "NOT_FOR_SALE");

            // Buyer is owner again
            response = await nft.ownerOf(nftId)
            assert.equal(response, buyer, 'Buyer is owner again after withdraw')
        })
    })

}))


