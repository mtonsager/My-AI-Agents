#!/usr/bin/env node
// mc-task.js — Mission Control task helper
// Usage:
//   node mc-task.js create "Title" "Description" "AssignedAgent"
//   node mc-task.js update <id> <status>
//   node mc-task.js reassign <id> <newAgent>   — reassign task, set old agent Active, set new agent Working
//   node mc-task.js agent-status <name> <status>   (Working|Active|Idle|Offline)
//   node mc-task.js list
//   node mc-task.js log <type> <actor> "message"

const { PrismaClient } = require('C:/Users/Matt/mission-control/node_modules/@prisma/client');
const p = new PrismaClient({
  datasources: { db: { url: 'file:C:/Users/Matt/mission-control/prisma/dev.db' } },
});

const [,, cmd, ...args] = process.argv;

// Agents that are real individuals (not comma-separated combos)
const KNOWN_AGENTS = ['Jarvis', 'George', 'Dilbert', 'Suzie', '007', 'Bob', 'Matt'];

function parseAgents(assignedAgent) {
  if (!assignedAgent) return [];
  return assignedAgent.split(',').map(a => a.trim()).filter(a => KNOWN_AGENTS.includes(a));
}

async function setAgentStatus(names, status) {
  if (!names.length) return;
  await p.agent.updateMany({ where: { name: { in: names } }, data: { status } });
}

async function logActivity(type, actor, message, meta) {
  try {
    await p.activityLog.create({ data: { type, actor, message, meta: meta ? JSON.stringify(meta) : null } });
  } catch (_) {} // never block main flow
}

async function main() {
  if (cmd === 'create') {
    const [title, description, assignedAgent, rawProject] = args;
    const project = (rawProject && rawProject.trim()) ? rawProject.trim() : 'MIS';

    // Generate sequential shortId for this project
    const count = await p.task.count({ where: { project } });
    const shortId = `${project}-${String(count + 1).padStart(3, '0')}`;

    const task = await p.task.create({ data: { title, description, assignedAgent, status: 'Backlog', project, shortId } });
    await logActivity('task_created', assignedAgent || 'Jarvis', `Created ${shortId}: ${title}`, { taskId: task.id, shortId });
    console.log(JSON.stringify(task, null, 2));

  } else if (cmd === 'update') {
    const [id, status] = args;
    const task = await p.task.update({ where: { id }, data: { status } });

    // Auto-update agent status based on task status
    const agents = parseAgents(task.assignedAgent);
    if (status === 'InProgress') {
      await setAgentStatus(agents, 'Working');
    } else if (['Done', 'ReadyForReview', 'Testing'].includes(status)) {
      // Check if any other InProgress tasks exist for these agents before marking idle
      for (const agent of agents) {
        const active = await p.task.count({ where: { assignedAgent: { contains: agent }, status: 'InProgress' } });
        if (active === 0) await p.agent.updateMany({ where: { name: agent }, data: { status: 'Active' } });
      }
    }
    await logActivity('task_updated', task.assignedAgent || 'Jarvis', `Updated ${task.shortId} → ${status}`, { taskId: task.id, shortId: task.shortId, status });
    console.log(JSON.stringify(task, null, 2));

  } else if (cmd === 'reassign') {
    const [id, newAgent] = args;
    if (!id || !newAgent) {
      console.error('Usage: node mc-task.js reassign <id> <newAgent>');
      process.exit(1);
    }

    // Get current task to find old agent
    const current = await p.task.findUnique({ where: { id } });
    if (!current) { console.error('Task not found:', id); process.exit(1); }

    const oldAgents = parseAgents(current.assignedAgent);
    const newAgents = parseAgents(newAgent);

    // Update the task
    const task = await p.task.update({ where: { id }, data: { assignedAgent: newAgent } });

    // Set old agents back to Active (if they have no other InProgress tasks)
    for (const agent of oldAgents) {
      if (newAgents.includes(agent)) continue; // staying on task, skip
      const active = await p.task.count({ where: { assignedAgent: { contains: agent }, status: 'InProgress' } });
      if (active === 0) await p.agent.updateMany({ where: { name: agent }, data: { status: 'Active' } });
    }

    // Set new agents to Working if task is InProgress
    if (task.status === 'InProgress') {
      await setAgentStatus(newAgents, 'Working');
    }

    await logActivity('task_updated', newAgent, `Reassigned ${task.shortId} to ${newAgent}`, { taskId: task.id, shortId: task.shortId, from: current.assignedAgent, to: newAgent });
    console.log(JSON.stringify(task, null, 2));

  } else if (cmd === 'agent-status') {
    const [name, status] = args;
    const result = await p.agent.updateMany({ where: { name }, data: { status } });
    console.log(JSON.stringify({ updated: result.count, name, status }));

  } else if (cmd === 'list') {
    const tasks = await p.task.findMany({ orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify(tasks, null, 2));

  } else if (cmd === 'log') {
    // Usage: node mc-task.js log <type> <actor> "message"
    const [type, actor, message] = args;
    if (!type || !actor || !message) {
      console.error('Usage: node mc-task.js log <type> <actor> "message"');
      process.exit(1);
    }
    const res = await fetch('http://localhost:3000/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, actor, message }),
    });
    if (!res.ok) {
      console.error('Failed to log activity:', res.status, await res.text());
      process.exit(1);
    }
    const log = await res.json();
    console.log(JSON.stringify(log, null, 2));

  } else {
    console.error('Unknown command:', cmd);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p['$disconnect']());
