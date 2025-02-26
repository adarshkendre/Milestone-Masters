import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ManualScheduleCreator from './ManualScheduleCreator';

interface GeminiErrorHandlerProps {
  error: { message: string };
  goalId: number;
  onScheduleCreated: () => void;
  onRetry: () => void;
}

const GeminiErrorHandler: React.FC<GeminiErrorHandlerProps> = ({ 
  error, 
  goalId, 
  onScheduleCreated, 
  onRetry 
}) => {
  const [showManualCreator, setShowManualCreator] = useState(false);
  
  const isScheduleError = error.message?.includes('Failed to generate schedule');
  
  if (!isScheduleError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>An Error Occurred</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-destructive">{error?.message || 'Unknown error'}</p>
          <Button onClick={onRetry}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Generation Failed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-destructive">
          {error.message}
        </p>
        
        <div className="flex gap-4">
          <Button variant="outline" onClick={onRetry}>
            Retry with AI
          </Button>
          
          <Button 
            onClick={() => setShowManualCreator(true)}
          >
            Create Schedule Manually
          </Button>
        </div>
        
        {showManualCreator && (
          <ManualScheduleCreator 
            goalId={goalId} 
            onScheduleCreated={onScheduleCreated} 
          />
        )}
      </CardContent>
    </Card>
  );
};

export default GeminiErrorHandler;
