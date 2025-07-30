import React from "react";
import SocialConnections from "../components/Profile/SocialConnections";

export default function IntegrationsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Social Integrations</h1>
      <SocialConnections />
    </div>
  );
}