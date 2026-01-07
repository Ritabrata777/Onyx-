import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // ERC-4337 EntryPoint (use existing deployment on Polygon)
  const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  // Deploy P256Verifier
  console.log("Deploying P256Verifier...");
  const P256Verifier = await ethers.getContractFactory("P256Verifier");
  const p256Verifier = await P256Verifier.deploy();
  await p256Verifier.waitForDeployment();
  console.log("P256Verifier deployed to:", await p256Verifier.getAddress());

  // Deploy WebAuthnAccountFactory
  console.log("Deploying WebAuthnAccountFactory...");
  const Factory = await ethers.getContractFactory("WebAuthnAccountFactory");
  const factory = await Factory.deploy(ENTRYPOINT_ADDRESS, await p256Verifier.getAddress());
  await factory.waitForDeployment();
  console.log("WebAuthnAccountFactory deployed to:", await factory.getAddress());

  // Deploy Paymaster
  console.log("Deploying Paymaster...");
  const Paymaster = await ethers.getContractFactory("Paymaster");
  const paymaster = await Paymaster.deploy(ENTRYPOINT_ADDRESS);
  await paymaster.waitForDeployment();
  console.log("Paymaster deployed to:", await paymaster.getAddress());

  // Fund paymaster
  console.log("Funding Paymaster...");
  const tx = await paymaster.deposit({ value: ethers.parseEther("0.1") });
  await tx.wait();
  console.log("Paymaster funded with 0.1 MATIC");

  console.log("\n=== Deployment Complete ===");
  console.log({
    P256Verifier: await p256Verifier.getAddress(),
    WebAuthnAccountFactory: await factory.getAddress(),
    Paymaster: await paymaster.getAddress(),
    EntryPoint: ENTRYPOINT_ADDRESS,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
