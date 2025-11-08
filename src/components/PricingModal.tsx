import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronUp, Crown, Building2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

const INDIVIDUAL_PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "per month",
    description: "For individuals getting started",
    features: [
      "3 Work Orders",
      "2 Properties",
      "2 Forms",
      "5 Calendar Events",
      "Basic sites",
      "Basic automations",
    ],
    cta: "Current Plan",
    highlighted: false,
    disabled: true,
  },
  {
    name: "Plus",
    price: "$10",
    period: "per month",
    description: "For power users",
    billedAnnually: "$12 billed monthly",
    features: [
      "Unlimited Work Orders",
      "Unlimited Properties",
      "Unlimited Forms",
      "Unlimited Calendar Events",
      "Custom forms & sites",
      "Basic integrations",
      "Priority support",
    ],
    cta: "Upgrade to Plus",
    highlighted: true,
  },
];

const ORGANIZATION_PLANS = [
  {
    name: "Business",
    price: "$20",
    period: "per member / month",
    badge: "Popular",
    description: "For small to medium teams",
    billedAnnually: "$24 billed monthly",
    features: [
      "Everything in Plus",
      "Team collaboration",
      "Advanced permissions",
      "Custom branding",
      "Advanced integrations",
      "API access",
      "Admin controls",
    ],
    cta: "Start Business Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$26",
    period: "per member / month",
    badge: "Advanced",
    description: "For large organizations",
    billedAnnually: "$32 billed monthly",
    features: [
      "Everything in Business",
      "SAML SSO",
      "Advanced security",
      "Audit logs",
      "Dedicated support",
      "Custom contracts",
      "99.9% uptime SLA",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const DETAILED_COMPARISON = [
  {
    category: "Content & Storage",
    features: [
      { name: "Work Orders", free: "Up to 3", plus: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
      { name: "Properties", free: "Up to 2", plus: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
      { name: "Forms", free: "Up to 2", plus: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
      { name: "Calendar Events", free: "Up to 5", plus: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
      { name: "File Uploads", free: "5 MB", plus: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
      { name: "Page History", free: "7 days", plus: "30 days", business: "90 days", enterprise: "Unlimited" },
    ],
  },
  {
    category: "Collaboration & Sharing",
    features: [
      { name: "Team Members", free: "Individual only", plus: "Individual only", business: "Unlimited", enterprise: "Unlimited" },
      { name: "Guest Seats", free: "0", plus: "0", business: "50", enterprise: "Starting at 250" },
      { name: "Permission Groups", free: false, plus: false, business: true, enterprise: true },
      { name: "Advanced Permissions", free: false, plus: false, business: true, enterprise: true },
    ],
  },
  {
    category: "Features",
    features: [
      { name: "Custom Forms", free: "Basic", plus: "Custom", business: "Custom + Logic", enterprise: "Custom + Logic" },
      { name: "Charts & Reports", free: "1", plus: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
      { name: "API Access", free: false, plus: false, business: true, enterprise: true },
      { name: "Webhooks", free: false, plus: false, business: true, enterprise: true },
      { name: "Automations", free: "Basic", plus: "Custom", business: "Custom", enterprise: "Custom" },
    ],
  },
  {
    category: "Admin & Security",
    features: [
      { name: "2-Step Verification", free: true, plus: true, business: true, enterprise: true },
      { name: "SAML SSO", free: false, plus: false, business: false, enterprise: true },
      { name: "Audit Logs", free: false, plus: false, business: false, enterprise: true },
      { name: "Advanced Security Controls", free: false, plus: false, business: true, enterprise: true },
      { name: "Workspace Analytics", free: false, plus: false, business: true, enterprise: true },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email Support", free: "Standard", plus: "Priority", business: "Priority", enterprise: "Dedicated" },
      { name: "Response Time", free: "48 hours", plus: "24 hours", business: "12 hours", enterprise: "4 hours" },
      { name: "Phone Support", free: false, plus: false, business: true, enterprise: true },
    ],
  },
];

export function PricingModal({ open, onClose }: PricingModalProps) {
  const [showComparison, setShowComparison] = useState(false);

  const renderFeatureValue = (value: string | boolean | number) => {
    if (typeof value === "boolean") {
      return value ? <Check className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground">—</span>;
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-2">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Start free and upgrade as you grow. All plans include core features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Individual Plans */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="text-xl font-semibold">Individual Plans</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {INDIVIDUAL_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-lg border-2 p-6 ${
                    plan.highlighted
                      ? "border-primary shadow-lg"
                      : "border-border"
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-2xl font-bold">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                      {plan.billedAnnually && (
                        <p className="text-xs text-muted-foreground mt-1">{plan.billedAnnually}</p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                      disabled={plan.disabled}
                    >
                      {plan.cta}
                    </Button>

                    <div className="space-y-2 pt-4 border-t">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organization Plans */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-purple-600" />
              <h3 className="text-xl font-semibold">Organization Plans</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {ORGANIZATION_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-lg border-2 p-6 ${
                    plan.highlighted
                      ? "border-primary shadow-lg"
                      : "border-border"
                  }`}
                >
                  {plan.badge && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      {plan.badge}
                    </Badge>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-2xl font-bold">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground text-xs">{plan.period}</span>
                      </div>
                      {plan.billedAnnually && (
                        <p className="text-xs text-muted-foreground mt-1">{plan.billedAnnually}</p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>

                    <div className="space-y-2 pt-4 border-t">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compare All Plans */}
          <Collapsible open={showComparison} onOpenChange={setShowComparison}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                {showComparison ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Comparison
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Compare All Plans
                  </>
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold">Free</th>
                        <th className="text-center p-4 font-semibold">Plus</th>
                        <th className="text-center p-4 font-semibold bg-primary/10">Business</th>
                        <th className="text-center p-4 font-semibold">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DETAILED_COMPARISON.map((category) => (
                        <>
                          <tr key={category.category} className="bg-muted/50">
                            <td colSpan={5} className="p-3 font-semibold text-sm">
                              {category.category}
                            </td>
                          </tr>
                          {category.features.map((feature, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-3 text-sm">{feature.name}</td>
                              <td className="p-3 text-center">{renderFeatureValue(feature.free)}</td>
                              <td className="p-3 text-center">{renderFeatureValue(feature.plus)}</td>
                              <td className="p-3 text-center bg-primary/5">{renderFeatureValue(feature.business)}</td>
                              <td className="p-3 text-center">{renderFeatureValue(feature.enterprise)}</td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="text-center text-sm text-muted-foreground">
            <p>All prices are in USD. Billing is handled securely through Stripe.</p>
            <p className="mt-1">Need help choosing? <button className="text-primary underline">Contact sales</button></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
