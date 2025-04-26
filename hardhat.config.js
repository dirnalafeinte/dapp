const dotenv = require('dotenv');
require("@nomicfoundation/hardhat-toolbox");require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: "0.8.28",
  networks: {
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    },
  },
};