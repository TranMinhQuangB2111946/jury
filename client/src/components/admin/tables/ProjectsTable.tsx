import { useEffect, useState } from 'react';
import ProjectRow from './ProjectRow';
import { useAdminStore, useOptionsStore } from '../../../store';
import HeaderEntry from './HeaderEntry';
import { ProjectSortField } from '../../../enums';
import { getRequest } from '../../../api';
import { errorAlert } from '../../../util';

const ProjectsTable = () => {
    const unsortedProjects = useAdminStore((state) => state.projects);
    const fetchProjects = useAdminStore((state) => state.fetchProjects);
    const [projects, setProjects] = useState<Project[]>([]);
    const [checked, setChecked] = useState<boolean[]>([]);
    const [flags, setFlags] = useState<Flag[]>([]);
    const [sortState, setSortState] = useState<SortState<ProjectSortField>>({
        field: ProjectSortField.None,
        ascending: true,
    });
    const options = useOptionsStore((state) => state.options);
    const selectedTrack = useOptionsStore((state) => state.selectedTrack);
    const currTrackScores = useOptionsStore((state) => state.currTrackScores);
    const currTrackStars = useOptionsStore((state) => state.currTrackStars);

    const handleCheckedChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
        setChecked({
            ...checked,
            [i]: e.target.checked,
        });
    };

    const updateSort = (field: SortField) => {
        if (sortState.field === field) {
            // If sorted on same field and descending, reset sort state
            if (!sortState.ascending) {
                setSortState({
                    field: ProjectSortField.None,
                    ascending: true,
                });
                setProjects(unsortedProjects);
                return;
            }

            // Otherwise, sort descending
            setSortState({
                field,
                ascending: false,
            });
        } else {
            // If in different sorted state, sort ascending on new field
            setSortState({
                field: field as ProjectSortField,
                ascending: true,
            });
        }
    };

    // On load, fetch projects
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Fetch flags on load
    useEffect(() => {
        async function getFlags() {
            const res = await getRequest<Flag[]>('/admin/flags', 'admin');
            if (res.status !== 200) {
                errorAlert(res);
            }
            setFlags(res.data as Flag[]);
        }

        getFlags();
    }, []);

    // When projects change, update projects and sort
    useEffect(() => {
        setChecked(Array(unsortedProjects.length).fill(false));

        // Filter by track if enabled
        const filteredProjects =
            options.judge_tracks && selectedTrack !== 'Main Judging'
                ? unsortedProjects.filter(
                      (project) => project.challenge_list.indexOf(selectedTrack) !== -1
                  )
                : unsortedProjects;

        if (options.judge_tracks && selectedTrack !== 'Main Judging') {
            // Add scores to project
            filteredProjects.forEach((project) => {
                const score = currTrackScores.find((s) => s.id === project.id);
                const star = currTrackStars.find((s) => s.id === project.id);
                if (score) {
                    project.score = score.score;
                } else {
                    console.error('No track score found for project', project);
                }
                if (star) {
                    project.stars = star.stars;
                } else {
                    console.error('No track star found for project', project);
                }
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let sortFunc = (_: Project, b: Project) => 0;
        const asc = sortState.ascending ? 1 : -1;
        switch (sortState.field) {
            case ProjectSortField.Name:
                sortFunc = (a, b) => a.name.localeCompare(b.name) * asc;
                break;
            case ProjectSortField.Flagged:
                sortFunc = (a, b) => {
                    const flagsA = flags
                        .filter((flag) => !flag.reason.includes('busy'))
                        .filter((flag) => flag.project_id === a.id).length;
                    const flagsB = flags
                        .filter((flag) => !flag.reason.includes('busy'))
                        .filter((flag) => flag.project_id === b.id).length;
                    return (flagsB - flagsA) * asc;
                };
                break;
            case ProjectSortField.TableNumber:
                sortFunc = (a, b) => (a.location - b.location) * asc;
                break;
            case ProjectSortField.Group:
                sortFunc = (a, b) => (a.group - b.group) * asc;
                break;
            case ProjectSortField.Score:
                sortFunc = (a, b) => (a.score - b.score) * asc;
                break;
            case ProjectSortField.Stars:
                sortFunc = (a, b) => (a.stars - b.stars) * asc;
                break;
            case ProjectSortField.Seen:
                sortFunc = (a, b) => (a.seen - b.seen) * asc;
                break;
            case ProjectSortField.Updated:
                sortFunc = (a, b) => (a.last_activity - b.last_activity) * asc;
                break;
        }
        setProjects(filteredProjects.sort(sortFunc));
    }, [unsortedProjects, sortState, selectedTrack]);

    return (
        <div className="w-full px-8 pb-4">
            <table className="table-fixed w-full text-lg">
                <tbody>
                    <tr>
                        <th className="w-12"></th>
                        <HeaderEntry
                            name="Name"
                            updateSort={updateSort}
                            sortField={ProjectSortField.Name}
                            sortState={sortState}
                            align="left"
                        />
                        <HeaderEntry
                            name="Flagged"
                            updateSort={updateSort}
                            sortField={ProjectSortField.Flagged}
                            sortState={sortState}
                        />
                        <HeaderEntry
                            name="Table Number"
                            updateSort={updateSort}
                            sortField={ProjectSortField.TableNumber}
                            sortState={sortState}
                        />
                        {options.multi_group && (
                            <HeaderEntry
                                name="Group"
                                updateSort={updateSort}
                                sortField={ProjectSortField.Group}
                                sortState={sortState}
                            />
                        )}
                        <HeaderEntry
                            name="Score"
                            updateSort={updateSort}
                            sortField={ProjectSortField.Score}
                            sortState={sortState}
                        />
                        <HeaderEntry
                            name="Stars"
                            updateSort={updateSort}
                            sortField={ProjectSortField.Stars}
                            sortState={sortState}
                        />
                        <HeaderEntry
                            name="Seen"
                            updateSort={updateSort}
                            sortField={ProjectSortField.Seen}
                            sortState={sortState}
                        />
                        <HeaderEntry
                            name="Updated"
                            updateSort={updateSort}
                            sortField={ProjectSortField.Updated}
                            sortState={sortState}
                        />
                        <th className="text-right w-24">Actions</th>
                    </tr>
                    {projects.map((project: Project, idx) => {
                        const projectFlags = flags
                            .filter((flag) => !flag.reason.includes('busy'))
                            .filter((flag) => flag.project_id === project.id);

                        return (
                            <ProjectRow
                                key={idx}
                                idx={idx}
                                project={project}
                                flags={projectFlags}
                                checked={checked[idx]}
                                handleCheckedChange={handleCheckedChange}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ProjectsTable;
