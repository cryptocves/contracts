// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract NFT is ERC721 {

  address public admin;
  address public marketplace;
  uint256 public nextTokenId;
  mapping(uint256 => Token) public tokens;
  mapping(string => uint256) public cveToTokenId;
  mapping(uint256 => string) public metadataHashes;

  struct Token {
    uint256 id;
    string cve;
  }

  constructor() ERC721('CVE NFT', 'CVE') {
    admin = msg.sender;
  }

  /// @notice mint new cve token
  function mint(address owner, string memory cve, string memory metadataHash) external returns(Token memory){

    // Require cve
    require(bytes(cve).length > 0, "MISSING_CVE");

    // Require metadata
    require(bytes(metadataHash).length > 0, "MISSING_METADATA");

    // Only marketplace can mint
    require(msg.sender == marketplace, "NOT_MARKETPLACE");

    // Prevent duplicate cves
    require(cveToTokenId[cve] == 0, "ALREADY_MINTED");

    nextTokenId++;
    Token memory token = Token({
        id: nextTokenId,
        cve: cve
    });

    tokens[token.id] = token;
    cveToTokenId[token.cve] = token.id;
    metadataHashes[token.id] = metadataHash;

    _safeMint(owner, token.id);

    return token;
  }

  /// @notice get token by id
  function getById(uint256 tokenId) external view returns(Token memory token) {
    return tokens[tokenId];
  }

  /// @notice get token by id
  function getTotalSupply() external view returns(uint256) {
    return nextTokenId;
  }

  /// @notice admin can set marketplace
  function setMarketplace(address _marketplace) external {
    require(msg.sender == admin, "ONLY_ADMIN");
    marketplace = _marketplace;
  }

  /// @notice admin can set admin
  function setAdmin(address _admin) external {
    require(msg.sender == admin, "ONLY_ADMIN");
    admin = _admin;
  }

  /// @notice get metadatahash from IPFS url
  function getHash(uint tokenId) external view returns (string memory) {
    return metadataHashes[tokenId];
  }

  /// @notice get IPFS url for metadata
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
      require(_exists(tokenId), "NOT_FOUND");
      return string(abi.encodePacked("https://ipfs.io/ipfs/",metadataHashes[tokenId]));
  }
}