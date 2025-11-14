import { FileText, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePinnedForms } from "@/hooks/use-form-submissions-pin";
import { useActiveOrg } from "@/hooks/use-active-org";
import { format } from "date-fns";

interface PinnedFormsWidgetProps {
  size: "S" | "M" | "L";
}

export const PinnedFormsWidget = ({ size }: PinnedFormsWidgetProps) => {
  const navigate = useNavigate();
  const { activeOrgId } = useActiveOrg();
  const { data: pinnedForms = [], isLoading } = usePinnedForms(activeOrgId);
  
  const maxItems = size === "S" ? 3 : size === "M" ? 5 : 7;
  const displayForms = pinnedForms.slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Pinned Forms</h3>
        </div>
        <button
          onClick={() => navigate("/forms")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </button>
      </div>

      {/* Forms List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">Loading...</p>
          </div>
        ) : displayForms.length > 0 ? (
          displayForms.map((form) => (
            <button
              key={form.id}
              onClick={() => navigate(`/forms?view=${form.id}`)}
              className="w-full flex items-center gap-3 text-left bg-card/50 hover:bg-accent/20 rounded-lg p-2.5 transition-colors group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {form.form_templates?.name || "Untitled Form"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {form.status === "draft" ? "Draft" : "Submitted"} • {format(new Date(form.created_at), "MMM d")}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No pinned forms</p>
          </div>
        )}
      </div>
    </div>
  );
};
