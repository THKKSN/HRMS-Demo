"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import type { TicketDetailDto, TicketStatus } from "@hrms/shared-types";
import {
  createTicketBoardWorkflowFromDto,
  getTicketBoardWorkflowStepState,
  resolveTicketBoardWorkflow,
} from "@hrms/shared-types";
import { Badge } from "@/components/ui/badge";

type WorkflowProps = {
  categoryName?: string;
  topicName?: string;
  subjectName: string;
  status: TicketStatus;
  workflowName?: string;
  workflowAutoAcknowledgeAfterDays?: number;
  workflowBoardSteps: TicketDetailDto["workflowBoardSteps"];
  workflowSteps: TicketDetailDto["workflowSteps"];
  workflowCurrentStepKey?: string;
  workflowCurrentStepIndexByStatus: TicketDetailDto["workflowCurrentStepIndexByStatus"];
};

// แปลง snapshot workflow ที่ติดมากับ ticket เป็น definition สำหรับวาดสถานี — ถ้าไม่มี snapshot ค่อย fallback ไป resolve จาก taxonomy
function useTicketBoardWorkflow({
  categoryName,
  topicName,
  subjectName,
  workflowName,
  workflowAutoAcknowledgeAfterDays,
  workflowBoardSteps,
  workflowSteps,
  workflowCurrentStepIndexByStatus,
}: Omit<WorkflowProps, "status" | "workflowCurrentStepKey">) {
  return useMemo(() => {
    if (workflowBoardSteps.length > 0) {
      return {
        key: "ticket-snapshot",
        name: workflowName ?? "Ticket Workflow",
        autoAcknowledgeAfterDays: workflowAutoAcknowledgeAfterDays,
        steps: workflowBoardSteps.map((step, index, allSteps) => ({
          key: step.key,
          label: step.label,
          actorType:
            (step.actorType as
              | "requester"
              | "supervisor"
              | "assignee"
              | "system"
              | undefined) ??
            (index === 0
              ? "requester"
              : index === allSteps.length - 1
                ? "requester"
                : "assignee"),
          kind:
            (step.kind as
              | "start"
              | "queue"
              | "working"
              | "review"
              | "acceptance"
              | "end"
              | undefined) ??
            (index === 0
              ? "start"
              : index === allSteps.length - 1
                ? "end"
                : "queue"),
        })),
        currentStepKeyByStatus: Object.entries(
          workflowCurrentStepIndexByStatus,
        ).reduce(
          (result, [ticketStatus, stepIndex]) => {
            if (typeof stepIndex === "number" && workflowBoardSteps[stepIndex])
              result[ticketStatus as TicketStatus] =
                workflowBoardSteps[stepIndex].key;
            return result;
          },
          {} as Partial<Record<TicketStatus, string>>,
        ),
      };
    }
    return (
      createTicketBoardWorkflowFromDto({
        workflowName,
        workflowAutoAcknowledgeAfterDays,
        workflowSteps,
        workflowCurrentStepIndexByStatus,
      }) ?? resolveTicketBoardWorkflow({ categoryName, topicName, subjectName })
    );
  }, [
    categoryName,
    subjectName,
    topicName,
    workflowAutoAcknowledgeAfterDays,
    workflowBoardSteps,
    workflowCurrentStepIndexByStatus,
    workflowName,
    workflowSteps,
  ]);
}

export function StatusStationLine(props: WorkflowProps) {
  const t = useTranslations("admin.ticket.station");
  const { status, workflowCurrentStepKey } = props;
  const workflow = useTicketBoardWorkflow(props);
  const stationState = (index: number) =>
    getTicketBoardWorkflowStepState(
      workflow,
      status,
      index,
      workflowCurrentStepKey,
    );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{t("title")}</p>
        </div>
        {status === "AwaitingRequesterConfirmation" &&
        workflow.autoAcknowledgeAfterDays ? (
          <Badge variant="warning">
            {t("autoClose", { days: workflow.autoAcknowledgeAfterDays })}
          </Badge>
        ) : null}
      </div>
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start justify-center px-2">
          {workflow.steps.map((step, index) => {
            const state = stationState(index);
            const nextState =
              index < workflow.steps.length - 1
                ? stationState(index + 1)
                : null;
            return (
              <div key={step.key} className="flex items-start">
                <div className="w-36 text-center" data-station-state={state}>
                  <div
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-4 ${state === "complete" ? "border-emerald-600 bg-emerald-600 text-white" : state === "current" ? "animate-pulse border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "border-slate-300 bg-white text-slate-400"}`}
                  >
                    {state === "complete" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    )}
                  </div>
                  <p
                    className={`mt-3 text-xs font-semibold leading-5 ${state === "upcoming" ? "text-slate-400" : "text-slate-600"}`}
                  >
                    {step.label}
                  </p>
                  {state === "current" ? (
                    <p className="mt-1 text-[10px] font-bold tracking-wide text-primary">
                      {t("current")}
                    </p>
                  ) : null}
                </div>
                {nextState ? (
                  <div
                    className={`mt-5 w-12 border-t-2 ${nextState === "upcoming" ? "border-dashed border-slate-300" : "border-solid border-emerald-500"}`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** แบบ list แนวตั้ง — ยังไม่ได้ใช้ในหน้า detail ปัจจุบัน เก็บไว้สำหรับ layout แคบ */
export function WorkflowStepTimeline(props: WorkflowProps) {
  const t = useTranslations("admin.ticket.station");
  const { status, workflowCurrentStepKey } = props;
  const workflow = useTicketBoardWorkflow(props);

  return (
    <section className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("timelineTitle")}</p>
          {/* workflow.name และ step.label เป็นชื่อที่ HR ตั้งเอง — ไม่แปล */}
          <p className="mt-1 text-xs text-muted-foreground">{workflow.name}</p>
        </div>
        {workflow.autoAcknowledgeAfterDays ? (
          <Badge variant="warning">
            {t("autoAck", { days: workflow.autoAcknowledgeAfterDays })}
          </Badge>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {workflow.steps.map((step, index) => {
          const state = getTicketBoardWorkflowStepState(
            workflow,
            status,
            index,
            workflowCurrentStepKey,
          );
          const dotClass =
            state === "complete"
              ? "border-emerald-600 bg-emerald-600"
              : state === "current"
                ? "border-primary bg-primary"
                : "border-slate-300 bg-white";
          const textClass =
            state === "upcoming" ? "text-muted-foreground" : "text-foreground";

          return (
            <div key={step.key} className="grid grid-cols-[20px_1fr] gap-3">
              <div className="flex justify-center pt-1">
                <span
                  className={`h-3.5 w-3.5 rounded-full border-2 ${dotClass}`}
                />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${textClass}`}>
                  {step.label}
                </p>
                {state === "current" && (
                  <p className="mt-0.5 text-xs text-primary">{t("current")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
