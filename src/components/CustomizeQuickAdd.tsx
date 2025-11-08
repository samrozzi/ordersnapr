import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function CustomizeQuickAdd() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Quick Add Button</CardTitle>
        <CardDescription>
          Control which items appear in the Quick Add floating button
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Quick Add customization is currently unavailable. This feature requires database tables that have not been created yet.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
