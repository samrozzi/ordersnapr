import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NoteTemplate } from "@/hooks/use-notes";

interface TemplatePreviewCardProps {
  template: NoteTemplate;
  onClick: () => void;
}

export function TemplatePreviewCard({ template, onClick }: TemplatePreviewCardProps) {
  const themeConfig = template.theme_config || {};
  const backgroundColor = themeConfig.background_color;
  const bannerImage = template.preview_image || themeConfig.banner_image;
  
  // Get gradient based on category
  const getCategoryGradient = () => {
    if (template.category === 'work') {
      return 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20';
    }
    return 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20';
  };

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden group",
        !backgroundColor && !bannerImage && `bg-gradient-to-br ${getCategoryGradient()}`
      )}
      style={{ backgroundColor: backgroundColor || undefined }}
      onClick={onClick}
    >
      {bannerImage && (
        <div className="relative h-20 bg-muted overflow-hidden">
          <img
            src={bannerImage}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">{template.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            </div>
            <CardDescription className="text-xs line-clamp-2">
              {template.description}
            </CardDescription>
            
            {/* Preview of blocks count */}
            {template.default_blocks && template.default_blocks.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-current"></span>
                  {template.default_blocks.length} block{template.default_blocks.length !== 1 && 's'}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
