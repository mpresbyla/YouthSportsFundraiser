import { useState } from "react";
import { useParams, useLocation, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplateSelector, type FundraiserTemplate } from "@/components/TemplateSelector";
import { TemplateConfig } from "@/components/TemplateConfig";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function CreateFundraiser() {
  const params = useParams();
  const teamId = parseInt(params.teamId!);
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"template" | "basic" | "config">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<FundraiserTemplate | null>(null);
  const [basicInfo, setBasicInfo] = useState({
    title: "",
    description: "",
    goalAmount: "",
    endDate: "",
  });

  const createFundraiser = trpc.fundraiser.create.useMutation({
    onSuccess: () => {
      toast.success("Fundraiser created successfully!");
      setLocation(`/team/${teamId}/dashboard`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create fundraiser");
    },
  });

  const createRaffleItems = trpc.templates.createRaffleItem.useMutation();
  const createRaffleTiers = trpc.templates.createRaffleTiers.useMutation();
  const createSquaresGrid = trpc.templates.createSquaresGrid.useMutation();
  const createChallengeGoals = trpc.templates.createChallengeGoals.useMutation();
  const createCalendarDates = trpc.templates.createCalendarDates.useMutation();
  const createDonationMatching = trpc.templates.createDonationMatching.useMutation();

  const handleTemplateSelect = (template: FundraiserTemplate) => {
    setSelectedTemplate(template);
    setStep("basic");
  };

  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For direct_donation and micro_fundraiser, skip to final submission
    if (selectedTemplate === "direct_donation" || selectedTemplate === "micro_fundraiser") {
      handleFinalSubmit({});
    } else {
      setStep("config");
    }
  };

  const handleFinalSubmit = async (templateConfig: any) => {
    try {
      // Create the base fundraiser
      const fundraiserType = selectedTemplate === "micro_fundraiser" ? "micro_fundraiser" : "direct_donation";
      
      const fundraiserData: any = {
        teamId,
        title: basicInfo.title,
        description: basicInfo.description || undefined,
        fundraiserType,
        fundraiserTemplate: selectedTemplate,
        goalAmount: basicInfo.goalAmount ? Math.round(parseFloat(basicInfo.goalAmount) * 100) : undefined,
        endDate: basicInfo.endDate ? new Date(basicInfo.endDate) : undefined,
      };

      if (selectedTemplate === "micro_fundraiser") {
        fundraiserData.config = {
          metricName: "points",
          baseAmount: 100,
        };
      }

      const result = await createFundraiser.mutateAsync(fundraiserData);
      const fundraiserId = result.id;

      // Create template-specific data
      if (selectedTemplate === "raffle" && templateConfig.items && templateConfig.tiers) {
        for (const item of templateConfig.items) {
          if (item.title) {
            await createRaffleItems.mutateAsync({
              fundraiserId,
              title: item.title,
              description: item.description,
            });
          }
        }
        await createRaffleTiers.mutateAsync({
          fundraiserId,
          tiers: templateConfig.tiers.map((t: any) => ({
            price: t.price * 100,
            entries: t.entries,
            label: t.label,
          })),
        });
      }

      if (selectedTemplate === "squares" && templateConfig.homeTeam) {
        await createSquaresGrid.mutateAsync({
          fundraiserId,
          pricePerSquare: templateConfig.pricePerSquare,
          homeTeam: templateConfig.homeTeam,
          awayTeam: templateConfig.awayTeam,
          eventDate: new Date(templateConfig.eventDate),
        });
      }

      if (selectedTemplate === "challenge" && templateConfig.goals) {
        await createChallengeGoals.mutateAsync({
          fundraiserId,
          goals: templateConfig.goals.map((g: any) => ({
            goalAmount: parseInt(g.goalAmount) * 100,
            challengeDescription: g.challengeDescription,
          })),
        });
      }

      if (selectedTemplate === "calendar" && templateConfig.month) {
        await createCalendarDates.mutateAsync({
          fundraiserId,
          month: templateConfig.month,
          basePrice: templateConfig.basePrice,
        });
      }

      if (selectedTemplate === "donation_matching" && templateConfig.sponsorName) {
        await createDonationMatching.mutateAsync({
          fundraiserId,
          sponsorName: templateConfig.sponsorName,
          matchAmount: templateConfig.matchAmount,
          matchRatio: templateConfig.matchRatio || 100,
          expiresAt: templateConfig.expiresAt ? new Date(templateConfig.expiresAt) : undefined,
        });
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to create fundraiser");
    }
  };

  if (!teamId) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === "config") setStep("basic");
              else if (step === "basic") setStep("template");
              else setLocation(`/team/${teamId}/dashboard`);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {step === "template" && (
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={handleTemplateSelect}
          />
        )}

        {step === "basic" && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Tell supporters about your fundraiser
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Fundraiser Title</Label>
                  <Input
                    id="title"
                    value={basicInfo.title}
                    onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                    placeholder="Spring Season Fundraiser"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={basicInfo.description}
                    onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                    placeholder="Help us raise funds for new equipment and travel expenses"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="goalAmount">Goal Amount ($)</Label>
                  <Input
                    id="goalAmount"
                    type="number"
                    value={basicInfo.goalAmount}
                    onChange={(e) => setBasicInfo({ ...basicInfo, goalAmount: e.target.value })}
                    placeholder="5000"
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={basicInfo.endDate}
                    onChange={(e) => setBasicInfo({ ...basicInfo, endDate: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep("template")}>
                    Back
                  </Button>
                  <Button type="submit">
                    {selectedTemplate === "direct_donation" || selectedTemplate === "micro_fundraiser"
                      ? "Create Fundraiser"
                      : "Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "config" && selectedTemplate && (
          <TemplateConfig
            template={selectedTemplate}
            onSubmit={handleFinalSubmit}
            onBack={() => setStep("basic")}
          />
        )}
      </div>
    </div>
  );
}
