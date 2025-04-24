import { buildModule, ModuleBuilder } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

export default buildModule("EtherStaking", (m: ModuleBuilder) => {
  const owner = m.getAccount(0);

  // Deploy FitechToken
  const fitechToken = m.contract("FitechToken", [owner], {
    from: owner,
  });

  // Deploy EtherStaking, passing FitechToken address
  const etherStaking = m.contract("EtherStaking", [fitechToken, owner], {
    from: owner,
  });

  // Post-deployment: Mint and deposit reward tokens
  m.call(fitechToken, "mint", [owner, parseUnits("10000", 18)], { from: owner });
  m.call(fitechToken, "approve", [etherStaking, parseUnits("10000", 18)], { from: owner });
  m.call(etherStaking, "depositRewardTokens", [parseUnits("10000", 18)], { from: owner });

  return { fitechToken, etherStaking };
});