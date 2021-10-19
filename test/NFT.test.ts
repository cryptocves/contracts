
contract('NFT', (accounts => {

    const truffleAssert = require('truffle-assertions');
    const NFT = artifacts.require("NFT")
    const Marketplace = artifacts.require("Marketplace")

    let nft: any,  
    marketplace: any, 
    admin = accounts[0], 
    minter = accounts[1], 
    nftName = "CVE NFT", 
    nftSymbol = "CVE",
    metadataHash = '773a5434b13610B593Ac2'

    before(async () => {
        nft = await NFT.deployed()
        marketplace = await Marketplace.deployed()
        await nft.setMarketplace(marketplace.address, { from: admin})
    })

    describe('Deployment',  async () => {

        it('NFT deploys successfully', async () => {
            const address = nft.address
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

        it('NFT has name', async () => {
            const name = await nft.name()
            assert.equal(name, nftName)
        })

        it('NFT has symbol', async () => {
            const symbol = await nft.symbol()
            assert.equal(symbol, nftSymbol)
        })
    })

    describe('Mint', async() => {

        it('Mint validation', async () => {

            // Mint nft without cve should fail
            await truffleAssert.reverts(marketplace.mintNFT("", "", { from: admin }), "MISSING_CVE");
            
            // Mint nft without metadata hash should fail
            await truffleAssert.reverts(marketplace.mintNFT("CVE-2021-0000", "", { from: admin }), "MISSING_METADATA");
        })

        it('Mint', async () => {
            
            // Mint NFT
            const result = await marketplace.mintNFT("CVE-2021-0000", metadataHash, { 
                from: admin
            })
            const event = await result.logs[0].args
            const nftToken = await nft.getById(event.nftId)

            // NFT should exist
            assert.equal(nftToken.id, 1)
            assert.equal(event.to, admin, 'to is corrent')
            assert.equal(nftToken.cve, "CVE-2021-0000", 'cve is correct')
        })

        it('getTotalSupply', async () => {

            const totalSupply = await nft.getTotalSupply()
            assert.equal(totalSupply, 1)
        })

        it('getById', async () => {
            const id = 1
            const nftToken = await nft.getById(id)
            assert.equal(nftToken.id, id)
        })

        it('tokenURI', async () => {
            const id = 1
            const nftTokenUri = await nft.tokenURI(id)
            assert.equal(nftTokenUri, "https://ipfs.io/ipfs/"+metadataHash)
        })

        it('nextTokenId', async () => {
            const id = 1
            const nextTokenId = await nft.nextTokenId()
            assert.equal(nextTokenId, id, 'NextTokenId should increment by one')
        })
    })

    describe('Restricted functions', async () => {  

        it('mint is restricted to marketplace', async () => {
            
            const response = nft.mint(admin, "CVE-2021-0000", metadataHash)
            await truffleAssert.reverts(response, "NOT_MARKETPLACE");
        })

    })

}))