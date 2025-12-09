import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..core.audit import send_audit_event
from ..core.auth import get_current_subject, require_roles
from ..core.config import get_settings
from ..models.domain import Task, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
async def list_tasks(
    patient_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None),
    subject: str = Depends(get_current_subject),
) -> list[Task]:
    settings = get_settings()
    params = {}
    if patient_id:
        params["patient_id"] = patient_id
    if status_filter:
        params["status_filter"] = status_filter
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.tasks_service_url}/tasks", params=params)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return [Task(**t) for t in resp.json()]


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    subject: str = Depends(get_current_subject),
    role: str = Depends(require_roles("admin", "doctor", "nurse")),
) -> Task:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.tasks_service_url}/tasks",
            json={**payload.dict(), "created_by": subject},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    task = Task(**resp.json())
    await send_audit_event(
        action="task_created",
        subject=subject,
        actor_role=role,
        detail=f"task={task.id}; patient={task.patient_id}",
    )
    return task


@router.patch("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    subject: str = Depends(get_current_subject),
    role: str = Depends(require_roles("admin", "doctor", "nurse")),
) -> Task:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{settings.tasks_service_url}/tasks/{task_id}", json=payload.dict()
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    task = Task(**resp.json())
    await send_audit_event(
        action="task_updated",
        subject=subject,
        actor_role=role,
        detail=f"task={task.id}; status={task.status}",
    )
    return task
