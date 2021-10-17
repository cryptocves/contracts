// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NFT.sol";
import "./Token.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @title Marketplace contract
contract Marketplace is IERC721Receiver {

    address public admin; 
    mapping(uint256 => Offer) public offers;
    NFT public nft;
    Token public token;
    bool public marketplaceIsOpen;

    // Fees
    uint256 public mintFee; // Wei
    uint256 public marketplaceFee = 20; // Price divided, e.g. 20 = 5% of price
    uint256 public mintYield = 1000000000000000000; // 18 decimals = 1 CVE Token
    uint256 public transferYield = 500000000000000000; // 18 decimals = 0.5 CVE Token

    // NFT events
    event NftMinted(address to, string cve, uint256 nftId, string metadataHash);
    event NftOffer(uint256 indexed nftId, uint256 price);
    event NftOfferWithdraw(uint256 indexed nftId); 
    event NftSold(uint256 indexed nftId, uint256 price, address indexed oldOwner, address indexed newOwner);
    event NftPurchased(uint256 indexed nftId, uint256 price, address indexed oldOwner, address indexed newOwner);

    // Token events
    event TokenMinted(address to, uint256 amount);
    event TokenSold(address to, uint256 amount);

    struct Offer {
        uint256 nftId;
        string cve;
        uint256 price;
        address owner;
    }
    
    constructor(address _nft, address _token) {
        admin = msg.sender;
        nft = NFT(_nft);
        token = Token(_token);
        marketplaceIsOpen = true;
    }

    /// @notice mint new cve token
    function mintNFT(string memory cve, string memory metadataHash) external payable {

        // Marketplace is closed
        require(marketplaceIsOpen, 'MARKETPLACE_CLOSED');

        // Mint NFT
        NFT.Token memory nftToken = nft.mint(msg.sender, cve, metadataHash);

        // Mint Yield
        token.reward(msg.sender, mintYield);

        // Pay application fee if required
        if(msg.sender == admin){ // Admin dont pay fee
        } else if(mintFee > 0){
            require(msg.value >= mintFee, "PAYMENT_TOO_LOW");
            uint256 refund = msg.value - mintFee;
            if(refund > 0)
                payable(msg.sender).transfer(refund);

            payable(admin).transfer(mintFee);
        } 
        emit NftMinted(msg.sender, nftToken.cve, nftToken.id, metadataHash);
        emit TokenMinted(msg.sender, mintYield);
    }

    /// @notice Put up token for sale
    function offerNFT(uint256 _nftId, uint256 _price) public {

        // Marketplace is closed
        require(marketplaceIsOpen, 'MARKETPLACE_CLOSED');

        // You can only sell your own token
        require(nft.ownerOf(_nftId) == msg.sender, "NOT_OWNER");

        // Marketplace is approved to handle token
        require(nft.getApproved(_nftId) == address(this), "NOT_APPROVED");

        // Price must be minium mint fee
        require(_price >= mintFee, "TOO_LOW_PRICE");

        NFT.Token memory nftToken = nft.getById(_nftId);

        // NFT exists
        require(nftToken.id == _nftId, "NOT_FOUND"); 

        // Transfer token from owner to Marketplace
        nft.safeTransferFrom(msg.sender, address(this), nftToken.id);

        Offer memory offer = Offer({
            nftId: nftToken.id,
            cve: nftToken.cve,
            price: _price,
            owner: msg.sender
        });

        offers[offer.nftId] = offer;

        emit NftOffer(_nftId, _price);
    }

    /// @notice Purchase token
    function buyNFT(uint256 _nftId) public payable {

        Offer memory offer = offers[_nftId];

        // Marketplace is closed
        require(marketplaceIsOpen, 'MARKETPLACE_CLOSED');

        // Not for sale
        require(offer.nftId == _nftId, "NOT_FOR_SALE"); 

        // Missing payment
        require(msg.value > 0, "MISSING_PAYMENT"); 

        uint256 fee = (offer.price / marketplaceFee);
        uint256 totalPrice = (offer.price + fee);

        // Owner cannot buy own token
        require(offer.owner != msg.sender, "NOT_ALLOWED_BUY_OWN_TOKEN"); 

        // Payment has to be equal or more than nft price + marketplace fee
        require(msg.value >= totalPrice, "PAYMENT_TOO_LOW");

        // Pay refund if needed
        uint256 refund = (msg.value - totalPrice);
        if(refund > 0)
            payable(msg.sender).transfer(refund);

        // Pay seller the token price
        payable(offer.owner).transfer(offer.price);

        // Pay marketplace fee to admin
        payable(admin).transfer(fee);

        // Transfer Yield
        token.reward(offer.owner, transferYield);

        // Approve new owner to handle token
        nft.approve(msg.sender, offer.nftId);

        // Transfer token to new owner
        nft.safeTransferFrom(address(this), msg.sender, offer.nftId);
        
        emit NftSold(offer.nftId, offer.price, offer.owner, msg.sender);
        emit NftPurchased(offer.nftId, offer.price, offer.owner, msg.sender);
        emit TokenMinted(msg.sender, transferYield);

        // Delete token from offers in marketplace
        deleteOffer(offer.nftId);
    }

    /// @notice Remove offer
    function withdrawOffer(uint256 _nftId) public {

        Offer memory offer = offers[_nftId];

        // NFT must be in offers
        require(offer.nftId == _nftId, "NOT_FOR_SALE"); 

        // Must be owner
        require(offer.owner == msg.sender, 'NOT_OWNER');
        
        // Delete token
        deleteOffer(_nftId);

        // Transfer token back to owner
        nft.safeTransferFrom(address(this), msg.sender, _nftId);

        emit NftOfferWithdraw(_nftId);
    }

    function transferFrom(address from, address to, uint256 nftId) external {
        address owner = nft.ownerOf(nftId);
        require(msg.sender == owner || nft.getApproved(nftId) == msg.sender, "NOT_ALLOWED");
        nft.transferFrom(from, to, nftId);
    }

    // @notice get token by id
    function offerById(uint256 nftId) external view returns(Offer memory offer) {
        return offers[nftId];
    }

    /// @notice Delete offer from offers
     function deleteOffer(uint256 _nftId) private {
        delete offers[_nftId];
    }

    /// @notice only admin can open or close marketplace
    function openMarketplace(bool _marketplaceIsOpen) external {
        require(msg.sender == admin, "NOT_ADMIN");
        marketplaceIsOpen = _marketplaceIsOpen;
    }

    /// @notice only admin can set marketplace fee
    function setMarketplaceFee(uint256 _value) external {
        require(msg.sender == admin, "NOT_ADMIN");
        marketplaceFee = _value;
    }

    /// @notice get nft price
    function getNftPrice(uint256 _nftId) external view returns(uint256){
        Offer memory offer = offers[_nftId];
        uint256 fee = (offer.price / marketplaceFee);
        return (offer.price + fee);
    }

    /// @notice admin can set mint fee
    function setMintFee(uint256 _mintFee) external {
        require(msg.sender == admin, "NOT_ADMIN");
        mintFee = _mintFee;
    }

    /// @notice admin can set mint yield
    function setMintYield(uint256 _mintYield) external {
        require(msg.sender == admin, "NOT_ADMIN");
        mintYield = _mintYield;
    }

    /// @notice admin can set mint yield
    function setTransferYield(uint256 _transferYield) external {
        require(msg.sender == admin, "NOT_ADMIN");
        transferYield = _transferYield;
    }

    /// @notice Required to return `IERC721Receiver.onERC721Received.selector`.
    function onERC721Received(address operator, address from, uint256 nftId, bytes calldata data) override external returns (bytes4){
        return this.onERC721Received.selector;
    }

}
