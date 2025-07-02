import React from "react";
import { NavigationHeader } from "@/components/ui/navigation-header";
import AdminPaymentsPanel from "../components/AdminPaymentsPanel";

export default function AdminPayments() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        title="Payment Verification" 
        subtitle="Review and approve pending PhonePe payments"
      />
      <AdminPaymentsPanel />
    </div>
  );
}