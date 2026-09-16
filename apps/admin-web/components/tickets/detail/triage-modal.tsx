"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { localizedName, type Locale } from "@hrms/i18n";
import type { TicketDetailDto } from "@hrms/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useTriageTicket } from "@/hooks/use-tickets";
import {
  useManagedTicketCategories,
  useManagedTicketSubjects,
  useManagedTicketTopics,
} from "@/hooks/use-ticket-taxonomy";
import { useApiError } from "@/hooks/use-api-error";

/** แก้ไขข้อมูลใบแจ้งเรื่อง (หมวด/หัวข้อ/รายละเอียด) โดย Supervisor ก่อนมอบหมาย */
export function TriageModal({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto;
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.triage");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const locale = useLocale() as Locale;
  const triage = useTriageTicket(ticket.id);
  const [categoryId, setCategoryId] = useState(ticket.categoryId);
  const [topicId, setTopicId] = useState(ticket.topicId);
  const [subjectId, setSubjectId] = useState(ticket.subjectId ?? "");
  const [otherTopicText, setOtherTopicText] = useState(
    ticket.otherTopicText ?? "",
  );
  const [detail, setDetail] = useState(ticket.detail ?? "");
  const [locationText, setLocationText] = useState(ticket.locationText ?? "");
  const { data: categories = [] } = useManagedTicketCategories(
    ticket.targetCompanyId,
    ticket.targetDepartmentId ?? "",
  );
  const { data: topics = [] } = useManagedTicketTopics(
    ticket.targetCompanyId,
    ticket.targetDepartmentId ?? "",
    categoryId ?? "",
  );
  const { data: subjects = [] } = useManagedTicketSubjects(
    ticket.targetCompanyId,
    ticket.targetDepartmentId ?? "",
    categoryId ?? "",
    topicId ?? "",
  );
  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const selectedSubject = subjects.find((subject) => subject.id === subjectId);
  // "อื่น ๆ" เป็นชื่อไทยที่ HR ตั้งไว้ใน master data (กติกาเดิม) — เทียบกับ name ไทยเสมอไม่ว่าจอจะเป็นภาษาอะไร
  const requiresOther =
    selectedTopic?.name.trim() === "อื่น ๆ" ||
    selectedSubject?.name.trim() === "อื่น ๆ";

  async function submit() {
    if (!categoryId || !topicId)
      return toast.error(t("categoryRequired"));
    if (requiresOther && !otherTopicText.trim())
      return toast.error(t("otherRequired"));
    try {
      await triage.mutateAsync({
        categoryId,
        topicId,
        subjectId: subjectId || undefined,
        otherTopicText: requiresOther ? otherTopicText.trim() : undefined,
        detail: detail.trim() || undefined,
        priority: ticket.priority,
        locationText: locationText.trim() || undefined,
        vehicleText: ticket.vehicleText ?? undefined,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(t("saved"));
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <Modal open onClose={onClose} title={t("title")} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("category")}</Label>
          <Select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setTopicId("");
              setSubjectId("");
              setOtherTopicText("");
            }}
          >
            <option value="">{t("selectCategory")}</option>
            {categories
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {localizedName(item, locale)}
                </option>
              ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("topic")}</Label>
          <Select
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              setSubjectId("");
              setOtherTopicText("");
            }}
          >
            <option value="">{t("selectTopic")}</option>
            {topics
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {localizedName(item, locale)}
                </option>
              ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("subject")}</Label>
          <Select
            value={subjectId}
            disabled={!topicId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">{t("noSubject")}</option>
            {subjects
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {localizedName(item, locale)}
                </option>
              ))}
          </Select>
        </div>
        {requiresOther && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("otherTopic")}</Label>
            <Input
              value={otherTopicText}
              onChange={(event) => setOtherTopicText(event.target.value)}
              maxLength={200}
            />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("detail")}</Label>
          <textarea
            rows={5}
            maxLength={2000}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {/* งานภายในไม่ใช้สถานที่ — เปิดเฉพาะ ticket จาก external portal (แจ้งซ่อม) */}
        {ticket.requester.type === "External" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("location")}</Label>
            <Input
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              maxLength={200}
            />
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {tCommon("action.cancel")}
        </Button>
        <Button loading={triage.isPending} onClick={submit}>
          {tCommon("action.save")}
        </Button>
      </div>
    </Modal>
  );
}
