import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, ArrowLeft } from "lucide-react";

export default function FundraiserPreview() {
  const { id } = useParams<{ id: string }>();
  const fundraiserId = parseInt(id || "0");

  const { data: fundraiser, isLoading } = trpc.fundraiser.getById.useQuery(
    { id: fundraiserId },
    { enabled: !!fundraiserId }
  );

  const { data: team } = trpc.team.getById.useQuery(
    { id: fundraiser?.teamId || 0 },
    { enabled: !!fundraiser?.teamId }
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading preview...</div>
        </div>
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Fundraiser Not Found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = fundraiser.goalAmount
    ? ((fundraiser.totalAmountPledged || 0) / fundraiser.goalAmount) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Mode Banner */}
      <div className="bg-yellow-500 text-white py-3 px-4 sticky top-0 z-50 shadow-md">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5" />
            <div>
              <div className="font-semibold">Preview Mode</div>
              <div className="text-sm text-yellow-100">
                This is how your fundraiser will look to donors. Payments are disabled in preview mode.
              </div>
            </div>
          </div>
          <Link href={`/team/${fundraiser.teamId}/dashboard`}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Fundraiser Content */}
      <div className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold">{fundraiser.title}</h1>
            {fundraiser.description && (
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {fundraiser.description}
              </p>
            )}
            {team && (
              <div className="text-muted-foreground">
                Supporting <span className="font-semibold">{team.name}</span>
              </div>
            )}
          </div>

          {/* Progress Card */}
          {fundraiser.goalAmount && (
            <Card>
              <CardHeader>
                <CardTitle>Fundraising Progress</CardTitle>
                <CardDescription>
                  {formatCurrency(fundraiser.totalAmountPledged || 0)} raised of{" "}
                  {formatCurrency(fundraiser.goalAmount)} goal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={Math.min(progress, 100)} className="h-3" />
                <div className="mt-2 text-sm text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </div>
              </CardContent>
            </Card>
          )}

          {/* Donation Form Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>
                {fundraiser.fundraiserType === "direct_donation"
                  ? "Make a Donation"
                  : "Make a Pledge"}
              </CardTitle>
              <CardDescription>
                {fundraiser.fundraiserType === "direct_donation"
                  ? "Support this fundraiser with a one-time donation"
                  : "Pledge per performance metric"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertTitle>Preview Mode</AlertTitle>
                <AlertDescription>
                  Payment forms are disabled in preview mode. Publish this fundraiser to accept real donations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Fundraiser Details */}
          <Card>
            <CardHeader>
              <CardTitle>Fundraiser Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium">
                    {fundraiser.fundraiserType === "direct_donation"
                      ? "Direct Donation"
                      : "Performance-Based Pledge"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium capitalize">{fundraiser.status}</div>
                </div>
                {fundraiser.endDate && (
                  <div>
                    <div className="text-sm text-muted-foreground">End Date</div>
                    <div className="font-medium">
                      {new Date(fundraiser.endDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {fundraiser.totalAmountCharged > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Total Raised</div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(fundraiser.totalAmountCharged)}
                    </div>
                  </div>
                )}
              </div>

              {fundraiser.fundraiserType === "micro_fundraiser" && fundraiser.config && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="font-semibold mb-2">Performance Pledge Details</div>
                  {(() => {
                    try {
                      const config = JSON.parse(fundraiser.config);
                      return (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Metric:</span>{" "}
                            <span className="font-medium">{config.metricName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Unit:</span>{" "}
                            <span className="font-medium">{config.metricUnit}</span>
                          </div>
                          {config.eventDate && (
                            <div>
                              <span className="text-muted-foreground">Event Date:</span>{" "}
                              <span className="font-medium">
                                {new Date(config.eventDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Link href={`/team/${fundraiser.teamId}/dashboard`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
