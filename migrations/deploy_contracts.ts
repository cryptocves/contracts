type Network = "development" | "rinkeby"

module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
  return async (
    deployer: Truffle.Deployer,
    network: Network,
    accounts: string[]
  ) => {

    const NFT = artifacts.require("NFT")
    const Token = artifacts.require("Token")
    const Marketplace = artifacts.require("Marketplace")

    // NFT
    await deployer.deploy(NFT)
    const nft = await NFT.deployed()

    // Token
    await deployer.deploy(Token)
    const token = await Token.deployed()
    
    // Marketplace
    await deployer.deploy(Marketplace, nft.address, token.address)
    const marketplace = await Marketplace.deployed()

    nft.setMarketplace(marketplace.address)
    token.setMarketplace(marketplace.address)

    process.env.NETWORK = network; 
    console.log(`NFT Artifact deployed at ${nft.address} in network: ${network}.`)
    console.log(`Token Artifact deployed at ${token.address} in network: ${network}.`)
    console.log(`Marketplace Artifact deployed at ${marketplace.address} in network: ${network}.`)
  };
};