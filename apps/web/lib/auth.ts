import { getSessionMeta } from "./auth/token-store";
import { canManageCampaigns as canManageCampaignsByRole, canRunSimulation as canRunSimulationByRole } from "./auth/permissions";

export function getUserRole() {
  return getSessionMeta().role;
}

export function isAdmin() {
  return getUserRole() === "Admin";
}

export function isManager() {
  return getUserRole() === "Manager";
}

export function canRunSimulation() {
  return canRunSimulationByRole(getUserRole());
}

export function canManageCampaigns() {
  return canManageCampaignsByRole(getUserRole());
}
