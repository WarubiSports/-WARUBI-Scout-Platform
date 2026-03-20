import React from 'react';
import { Plus, Link, Trash2, Flame } from 'lucide-react';
import { NewsItem } from '../../types';

interface NewsRoomTabProps {
    newsItems: NewsItem[];
    isAddingNews: boolean;
    setIsAddingNews: (value: boolean) => void;
    newsForm: Partial<NewsItem>;
    setNewsForm: (form: Partial<NewsItem>) => void;
    tickerInput: string;
    setTickerInput: (value: string) => void;
    onDeleteNews: ((id: string) => void) | undefined;
    handleSaveNews: () => void;
    handleSaveTicker: () => void;
}

export const NewsRoomTab: React.FC<NewsRoomTabProps> = ({
    newsItems,
    isAddingNews,
    setIsAddingNews,
    newsForm,
    setNewsForm,
    tickerInput,
    setTickerInput,
    onDeleteNews,
    handleSaveNews,
    handleSaveTicker,
}) => (
    <div className="space-y-6 animate-fade-in flex gap-6 h-[calc(100vh-140px)]">
        {/* Left: News Feed Manager */}
        <div className="flex-1 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">News Feed Manager</h2>
                <button
                    onClick={() => setIsAddingNews(!isAddingNews)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                    <Plus size={18} /> {isAddingNews ? 'Cancel' : 'Add New Post'}
                </button>
            </div>

            {isAddingNews && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                            <input
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newsForm.title}
                                onChange={e => setNewsForm({...newsForm, title: e.target.value})}
                                placeholder="e.g. New Partnership Announced"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                            <select
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newsForm.type}
                                onChange={e => setNewsForm({...newsForm, type: e.target.value})}
                            >
                                <option>General</option>
                                <option>Transfer News</option>
                                <option>Platform Update</option>
                                <option>Event Recap</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Summary</label>
                        <textarea
                            className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                            value={newsForm.summary}
                            onChange={e => setNewsForm({...newsForm, summary: e.target.value})}
                            placeholder="Brief description of the news item..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source</label>
                            <input
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newsForm.source}
                                onChange={e => setNewsForm({...newsForm, source: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Blog URL (Optional)</label>
                            <div className="relative">
                                <Link size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    className="w-full border border-gray-300 rounded p-2 pl-9 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newsForm.linkUrl}
                                    onChange={e => setNewsForm({...newsForm, linkUrl: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveNews}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold text-sm"
                        >
                            Publish Post
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                {newsItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No news items posted.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {newsItems.map(item => (
                            <div key={item.id} className="p-4 hover:bg-gray-50 flex justify-between items-start group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{item.type}</span>
                                        <span className="text-xs text-gray-400">{item.date}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-1">{item.summary}</p>
                                    {item.linkUrl && <a href={item.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"><Link size={10}/> {item.linkUrl}</a>}
                                </div>
                                <button
                                    onClick={() => onDeleteNews && onDeleteNews(item.id)}
                                    className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Post"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Right: Ticker Manager */}
        <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Flame size={20} className="text-red-500" /> Live Ticker Signals
            </h3>
            <p className="text-xs text-gray-500 mb-4">Edit the scrolling text shown on the News tab. Enter one item per line.</p>

            <textarea
                className="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4 font-mono text-gray-700 bg-gray-50"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                placeholder="Enter ticker items..."
            />

            <button
                onClick={handleSaveTicker}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 rounded-lg transition-colors"
            >
                Update Signals
            </button>
        </div>
    </div>
);
