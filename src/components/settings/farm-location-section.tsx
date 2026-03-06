"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { MapPin, ChevronDown, Mountain, Waves, Save } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  TAIWAN_COUNTIES,
  ELEVATION_BANDS,
  COASTAL_INLAND_OPTIONS,
} from "@/lib/data/taiwan-locations";

export const formSchema = z.object({
  countyCity: z.string().min(1, "請選擇縣市"),
  districtTownship: z.string().optional(),
  locality: z.string().optional(),
  elevationBand: z.string().optional(),
  coastalInland: z.string().optional(),
  farmLocationNotes: z.string().optional(),
  latitude: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90),
      { message: "緯度必須介於 -90 到 90 之間" },
    ),
  longitude: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= -180 && Number(v) <= 180),
      { message: "經度必須介於 -180 到 180 之間" },
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface FarmLocationSectionProps {
  farmId: Id<"farms"> | undefined;
}

export function FarmLocationSection({ farmId }: FarmLocationSectionProps) {
  const farmResult = useQuery(api.farms.getMyFarm);
  const updateLocation = useMutation(api.farms.updateFarmLocation);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const farm = farmResult?.farm;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countyCity: "",
      districtTownship: "",
      locality: "",
      elevationBand: "",
      coastalInland: "",
      farmLocationNotes: "",
      latitude: "",
      longitude: "",
    },
  });

  // Load farm data into form when available
  useEffect(() => {
    if (!farm) return;
    form.reset({
      countyCity: farm.countyCity ?? "",
      districtTownship: farm.districtTownship ?? "",
      locality: farm.locality ?? "",
      elevationBand: farm.elevationBand ?? "",
      coastalInland: farm.coastalInland ?? "",
      farmLocationNotes: farm.farmLocationNotes ?? "",
      latitude: farm.latitude != null ? String(farm.latitude) : "",
      longitude: farm.longitude != null ? String(farm.longitude) : "",
    });
  }, [farm, form]);

  const watchedCounty = form.watch("countyCity");

  const townships = useMemo(() => {
    if (!watchedCounty || !TAIWAN_COUNTIES[watchedCounty]) return [];
    return TAIWAN_COUNTIES[watchedCounty];
  }, [watchedCounty]);

  // Reset township when county changes and current value is not in new list
  useEffect(() => {
    const current = form.getValues("districtTownship");
    if (current && townships.length > 0 && !townships.includes(current)) {
      form.setValue("districtTownship", "");
    }
  }, [townships, form]);

  const countyNames = useMemo(() => Object.keys(TAIWAN_COUNTIES), []);

  async function onSubmit(values: FormValues) {
    if (!farmId) return;
    setSaving(true);
    try {
      await updateLocation({
        farmId,
        country: "TW",
        countyCity: values.countyCity || undefined,
        districtTownship: values.districtTownship || undefined,
        locality: values.locality || undefined,
        elevationBand: values.elevationBand || undefined,
        coastalInland: values.coastalInland || undefined,
        farmLocationNotes: values.farmLocationNotes || undefined,
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
      });
      toast.success("農地位置已更新");
    } catch {
      toast.error("更新失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          農地位置
        </CardTitle>
        <CardDescription>
          設定您農場的地理位置，以取得在地化的氣候與種植建議
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* County / Township row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="countyCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>縣市</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選擇縣市" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countyNames.map((county) => (
                          <SelectItem key={county} value={county}>
                            {county}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="districtTownship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>鄉鎮市區</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={townships.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              townships.length === 0
                                ? "請先選擇縣市"
                                : "選擇鄉鎮市區"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {townships.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Locality */}
            <FormField
              control={form.control}
              name="locality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>村里/地點</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：中華段 123 號"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Elevation / Coastal row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="elevationBand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Mountain className="h-3.5 w-3.5" />
                      海拔帶
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選擇海拔帶" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ELEVATION_BANDS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coastalInland"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Waves className="h-3.5 w-3.5" />
                      海岸/內陸
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選擇位置類型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COASTAL_INLAND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="farmLocationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備註</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="關於農場位置的其他說明..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced: Lat/Lng */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                  />
                  進階設定
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>緯度</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="例如：23.9769"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>經度</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="例如：121.6044"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={!farmId || saving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "儲存中..." : "儲存位置"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
