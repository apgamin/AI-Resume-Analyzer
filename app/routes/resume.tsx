import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [loadError, setLoadError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [auth.isAuthenticated, id, isLoading, navigate])

    useEffect(() => {
        if (isLoading || !auth.isAuthenticated || !id) return;

        let isActive = true;

        const loadResume = async () => {
            try {
                setLoadError('');
                const resume = await kv.get(`resume:${id}`);

                if (!resume) {
                    throw new Error('This resume analysis could not be found. Please analyze the resume again.');
                }

                const data = JSON.parse(resume);
                if (!data.feedback || typeof data.feedback !== 'object') {
                    throw new Error('The resume analysis was incomplete. Please analyze the resume again.');
                }

                // Show the AI feedback independently of the optional document previews.
                if (isActive) setFeedback(data.feedback);

                const [resumeBlob, imageBlob] = await Promise.all([
                    fs.read(data.resumePath),
                    fs.read(data.imagePath),
                ]);

                if (!isActive) return;

                if (resumeBlob) {
                    setResumeUrl(URL.createObjectURL(new Blob([resumeBlob], { type: 'application/pdf' })));
                }
                if (imageBlob) {
                    setImageUrl(URL.createObjectURL(imageBlob));
                }
            } catch (error) {
                if (!isActive) return;
                const message = error instanceof Error ? error.message : 'Unable to load the resume analysis.';
                console.error('Failed to load resume:', error);
                setLoadError(message);
            }
        };

        loadResume();

        return () => {
            isActive = false;
        };
    }, [auth.isAuthenticated, fs, id, isLoading, kv]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {loadError ? (
                        <p className="text-red-600 text-center">{loadError}</p>
                    ) : feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
