/**
 * Activity Feed Component
 * Display team activity stream
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity as ActivityIcon,
  MessageSquare,
  Share2,
  CheckCircle,
  Edit,
  Trash2,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { useActivities } from '@/hooks/use-activities';
import { formatDistanceToNow } from 'date-fns';
import type { Activity, ActivityType } from '@/lib/collaboration-types';

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function ActivityFeed({ limit = 50, showHeader = true, className }: ActivityFeedProps) {
  const { data: activities = [], isLoading } = useActivities(limit);

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Team Activity
          </CardTitle>
          <CardDescription>Recent activity from your team</CardDescription>
        </CardHeader>
      )}

      <CardContent className={showHeader ? '' : 'p-0'}>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Activity Item Component
// ============================================================================

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const userDisplayName = activity.username
    ? `@${activity.username}`
    : activity.user_full_name || activity.user_email || 'Unknown';

  const initials = activity.user_full_name
    ? activity.user_full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : activity.user_email?.[0]?.toUpperCase() || '?';

  const icon = getActivityIcon(activity.activity_type);
  const iconColor = getActivityIconColor(activity.activity_type);
  const description = getActivityDescription(activity);

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-10 w-10">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{userDisplayName}</span>{' '}
              <span className="text-muted-foreground">{description}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex items-center gap-1 text-xs ${iconColor}`}>
                {icon}
                <span className="capitalize">{activity.activity_type.replace('_', ' ')}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          <Badge variant="outline" className="text-xs">
            {getEntityTypeLabel(activity.entity_type)}
          </Badge>
        </div>

        {/* Additional metadata for certain activity types */}
        {activity.activity_type === 'status_change' && activity.metadata?.new_status && (
          <div className="mt-2 text-xs text-muted-foreground">
            Status: <span className="font-medium">{activity.metadata.old_status}</span> →{' '}
            <span className="font-medium">{activity.metadata.new_status}</span>
          </div>
        )}

        {activity.activity_type === 'comment' && activity.metadata?.content_preview && (
          <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
            "{activity.metadata.content_preview}
            {activity.metadata.content_preview.length >= 100 ? '...' : ''}"
          </div>
        )}

        {activity.activity_type === 'share' && activity.metadata?.message && (
          <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
            "{activity.metadata.message}"
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActivityIcon(type: ActivityType) {
  const iconClass = 'h-3 w-3';

  switch (type) {
    case 'comment':
      return <MessageSquare className={iconClass} />;
    case 'share':
      return <Share2 className={iconClass} />;
    case 'complete':
    case 'status_change':
      return <CheckCircle className={iconClass} />;
    case 'create':
      return <UserPlus className={iconClass} />;
    case 'update':
      return <Edit className={iconClass} />;
    case 'delete':
      return <Trash2 className={iconClass} />;
    case 'mention':
      return <AlertCircle className={iconClass} />;
    default:
      return <ActivityIcon className={iconClass} />;
  }
}

function getActivityIconColor(type: ActivityType): string {
  switch (type) {
    case 'comment':
      return 'text-blue-600';
    case 'share':
      return 'text-purple-600';
    case 'complete':
      return 'text-green-600';
    case 'status_change':
      return 'text-orange-600';
    case 'create':
      return 'text-green-600';
    case 'update':
      return 'text-blue-600';
    case 'delete':
      return 'text-red-600';
    case 'mention':
      return 'text-yellow-600';
    default:
      return 'text-muted-foreground';
  }
}

function getActivityDescription(activity: Activity): string {
  const entityLabel = getEntityTypeLabel(activity.entity_type).toLowerCase();

  switch (activity.activity_type) {
    case 'comment':
      return `commented on a ${entityLabel}`;
    case 'share':
      return `shared a ${entityLabel}`;
    case 'complete':
      return `completed a ${entityLabel}`;
    case 'status_change':
      return `changed status of a ${entityLabel}`;
    case 'create':
      return `created a ${entityLabel}`;
    case 'update':
      return `updated a ${entityLabel}`;
    case 'delete':
      return `deleted a ${entityLabel}`;
    case 'mention':
      return `mentioned someone in a ${entityLabel}`;
    case 'assignment':
      return `assigned a ${entityLabel}`;
    default:
      return `performed an action on a ${entityLabel}`;
  }
}

function getEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    work_order: 'Work Order',
    note: 'Note',
    invoice: 'Invoice',
    customer: 'Customer',
    property: 'Property',
    form_submission: 'Form',
    comment: 'Comment',
  };
  return labels[type] || type;
}
